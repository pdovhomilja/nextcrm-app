import { SEP, categoryPaths, fnv, mapRules, orderLists, productFields, sameProduct } from "./catalog-map";
import { ref } from "./map";
import type { OxoClient, OxoPriceList, OxoProduct } from "./oxo";
import { chosenLists, msg, type Ctx } from "./settings";
import { K, keepLock, type AccountLink, type CatalogCounts, type PriceListLink, type ProductLink } from "./store";

const OVERLAP_MS = 2 * 60_000;
const MAX_CHAIN = 11;   // core loads at most 11 lists per price (lib/pricing/get-price.ts MAX_LISTS)

export const zeroCatalog = (): CatalogCounts => ({ categoriesMatched: 0, categoriesCreated: 0, productsUpdated: 0, productsCreated: 0, productsFailed: 0, listsReplaced: 0, listsMissing: [], accountLists: 0 });

/** OXO ERP product id → CRM product id, for every product this plugin wrote. */
export async function productMap(ctx: Ctx): Promise<Map<number, string>> {
  return new Map((await ctx.store.list("product:")).map((e) => [(e.value as ProductLink).oxoId, e.key.slice(8)]));
}

export async function syncCatalog({ ctx, client, dry, now }: { ctx: Ctx; client: OxoClient; dry: boolean; now: Date }): Promise<{ counts: CatalogCounts; top: string | null }> {
  const counts = zeroCatalog();

  // 1. Categories: OXO ERP sends the full path; link it to the CRM category with the same path, else create it under its parent path (§ 10 A1).
  const paths = categoryPaths(await ctx.data.productCategories.findExternal());
  const matched = new Set<string>();
  const ensure = async (path: string): Promise<string> => {
    const known = paths.get(path);
    if (known) { if (!known.startsWith("oxo-cat:")) matched.add(path); return known; }
    const cut = path.lastIndexOf(SEP);
    const parentRef = cut > 0 ? await ensure(path.slice(0, cut)) : null;
    const r = `oxo-cat:${path}`;
    paths.set(path, r);
    counts.categoriesCreated++;
    if (!dry) await ctx.data.productCategories.upsertExternal(r, { name: cut > 0 ? path.slice(cut + SEP.length) : path, parentRef });
    return r;
  };

  // 2. Products changed since the cursor, plus those whose last write failed.
  const cursor = (await ctx.store.get<{ at: string }>(K.cursor("products")))?.at ?? null;
  const since = cursor ? new Date(Date.parse(cursor) - OVERLAP_MS).toISOString() : null;
  const fresh = await client.all<OxoProduct>("/products", since ? { updatedSince: since } : {});
  const retry = (await ctx.store.list("retryProduct:")).map((e) => (e.value as { product: OxoProduct }).product);
  const external = new Map((await ctx.data.products.findExternal()).map((p) => [p.ref, p.id]));
  const links = new Map((await ctx.store.list("product:")).map((e) => [e.key.slice(8), e.value as ProductLink]));
  const known = new Map<number, { ref: string; templateId: number | null }>(Array.from(links.values()).map((l) => [l.oxoId, { ref: l.ref, templateId: l.templateId }]));
  let top = cursor;
  const done = new Set<number>();
  for (const [i, p] of Array.from([...fresh, ...retry].entries())) {
    if ((i + 1) % 100 === 0) await keepLock(ctx);
    if (fresh.includes(p) && (!top || p.updatedAt > top)) top = p.updatedAt;
    if (done.has(p.id)) continue;
    done.add(p.id);
    const r = ref(p);
    const crmId = external.get(r);
    if (!crmId && !(p.saleOk && p.active)) continue;
    try {
      const categoryRef = p.category ? await ensure(p.category) : null;
      // A CRM product with the same SKU is adopted by core (adoptBySku): its tax, cost and description must survive too (§ 10 A5).
      const current = crmId ? await ctx.data.products.get(crmId)
        : p.code ? ((await ctx.data.products.find({ where: { sku: p.code, source: "CRM", deletedAt: null }, take: 1 }))[0] ?? null) : null;
      const f = productFields(p, categoryRef, ctx.settings.currency, current);
      known.set(p.id, { ref: r, templateId: p.odooTemplateId });
      if (crmId && sameProduct(current, f, links.get(crmId))) continue;
      if (dry) { counts[crmId ? "productsUpdated" : "productsCreated"]++; continue; }
      const res = await ctx.data.products.upsertExternal(r, f, { adoptBySku: true });
      if (res.adopted) ctx.log.info(`Took over CRM product ${f.sku} (${f.name})`, { oxoId: p.id, productId: res.id });
      counts[res.created ? "productsCreated" : "productsUpdated"]++;
      external.set(r, res.id);
      await ctx.store.set(K.product(res.id), { oxoId: p.id, ref: r, templateId: p.odooTemplateId, categoryRef } satisfies ProductLink);
      await ctx.store.delete(K.retryProduct(p.id));
    } catch (e) {
      counts.productsFailed++;
      known.delete(p.id);
      ctx.log.error(`Product ${p.id} failed: ${msg(e)}`, { oxoId: p.id });
      if (!dry) await ctx.store.set(K.retryProduct(p.id), { product: p });
    }
  }
  counts.categoriesMatched = matched.size;

  // 3. Price lists: chosen + the lists they build on, bases first; lists imported earlier stay in the run so a removed one is deactivated.
  const snapshot = new Map((await client.get<{ items: OxoPriceList[] }>("/price-lists")).items.map((l) => [l.id, l]));
  const chosen = chosenLists(ctx);
  const stored = new Map((await ctx.store.list("pricelist:")).map((e) => [Number(e.key.slice(10)), e.value as PriceListLink]));
  for (const id of chosen) if (!snapshot.has(id)) { counts.listsMissing.push(id); ctx.log.warn(`OXO ERP price list ${id} not found`); }
  const wanted = new Set<number>();
  const want = (id: number) => {
    const l = snapshot.get(id);
    if (!l || wanted.has(id)) return;
    wanted.add(id);
    for (const r of l.rules) if (r.base === "PRICE_LIST" && r.basePriceListId != null) want(r.basePriceListId);
  };
  [...chosen, ...Array.from(stored.keys())].forEach(want);
  const deps = new Map(Array.from(wanted).map((id) => [id, snapshot.get(id)!.rules.filter((r) => r.base === "PRICE_LIST" && r.basePriceListId != null && wanted.has(r.basePriceListId)).map((r) => r.basePriceListId!)]));
  const { order, cyclic, tooDeep } = orderLists(deps, MAX_CHAIN);
  for (const id of cyclic) ctx.log.warn(`Price list ${id} skipped: its base lists form a cycle`);
  for (const id of tooDeep) ctx.log.warn(`Price list ${id} skipped: it builds on more than ${MAX_CHAIN - 1} other lists`);
  const productRefs = new Map(Array.from(known).map(([oxoId, k]) => [oxoId, k.ref]));
  const templates = new Map<number, string[]>();
  for (const k of Array.from(known.values())) if (k.templateId != null) templates.set(k.templateId, [...(templates.get(k.templateId) ?? []), k.ref]);
  const listRefs = new Map<number, string>();
  for (const id of order) {
    const l = snapshot.get(id)!;
    for (const r of l.rules) if (r.appliesTo === "CATEGORY" && r.categoryName) await ensure(r.categoryName);
    const { rules, skipped } = mapRules(l.rules, productRefs, templates, (p) => paths.get(p) ?? null, (b) => listRefs.get(b) ?? null);
    const isActive = chosen.includes(id);
    const hash = fnv(JSON.stringify({ name: l.name, currency: l.currency, isActive, rules }));
    const prev = stored.get(id);
    listRefs.set(id, ref(l));
    if (!dry) await ctx.store.set(K.skipped(id), skipped);
    if (prev?.hash === hash) continue;
    counts.listsReplaced++;
    if (dry) continue;
    const { id: priceListId } = await ctx.data.priceLists.replaceExternal(ref(l), { name: l.name, currency: l.currency, isActive }, rules);
    await ctx.store.set(K.pricelist(id), { priceListId, ref: ref(l), name: l.name, currency: l.currency, hash, syncedAt: now.toISOString(), isActive } satisfies PriceListLink);
  }
  // A stored list OXO ERP no longer returns (archived there) is deactivated once.
  for (const [id, prev] of Array.from(stored)) {
    if (snapshot.has(id) || !prev.isActive) continue;
    counts.listsReplaced++;
    if (dry) continue;
    await ctx.data.priceLists.replaceExternal(prev.ref, { name: prev.name, currency: prev.currency, isActive: false }, []);
    await ctx.store.set(K.pricelist(id), { ...prev, isActive: false, hash: "", syncedAt: now.toISOString() } satisfies PriceListLink);
  }

  // 4. Account price lists follow the OXO ERP customer, chosen lists only.
  for (const e of await ctx.store.list("account:")) {
    const link = e.value as AccountLink;
    if (link.priceListId == null || !chosen.includes(link.priceListId)) continue;
    const list = await ctx.store.get<PriceListLink>(K.pricelist(link.priceListId));
    if (!list) continue;
    const accountId = e.key.slice(8);
    const acc = await ctx.data.accounts.get(accountId);
    if (!acc || acc.pricelist_id === list.priceListId) continue;
    counts.accountLists++;
    if (!dry) await ctx.data.accounts.update(accountId, { pricelist_id: list.priceListId });
  }
  return { counts, top };
}
