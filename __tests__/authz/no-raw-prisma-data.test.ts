// A server action takes whatever the client posts: its TypeScript parameter
// types do not exist at runtime. Passing a parameter (or a spread of one) as
// the `data` of a Prisma write lets the client add any column or a nested
// relation write. The scan below parses every "use server" file under
// actions/ and app/ and fails on a Prisma write whose `data` (or upsert
// `create`/`update`) is a parameter, a property of one, an alias of one, or an
// object that spreads one. Parse the input with zod and pass the parsed data,
// or pick the fields. A hit that is safe for another reason must be listed in
// REVIEWED with that reason.
//
// This is a tripwire for the common shapes, not a proof. Known limits:
// - only top-level function declarations and arrow/function expressions
//   assigned to a const are scanned; a function wrapped in any call
//   (createSafeAction or another wrapper) is skipped, and so are nested helpers;
// - only writes whose first argument is an object literal are checked
//   (`prismadb.x.update(args)` is not);
// - taint follows parameters, `const a = <tainted>` aliases and rest
//   destructuring only, not reassignment, function calls or other modules;
// - values nested inside picked fields (`data: { name: input.name }` where
//   name arrives as an object) are not checked; Prisma rejects objects on
//   scalar columns, relation fields need an explicit pick.
import fs from "fs";
import path from "path";
import ts from "typescript";

const REVIEWED: Record<string, string> = {};

const ROOT = path.join(__dirname, "../..");
const WRITE_METHODS = new Set([
  "create", "createMany", "createManyAndReturn", "update", "updateMany", "updateManyAndReturn", "upsert",
]);
const DATA_KEYS = new Set(["data", "create", "update"]);

function files(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === "__tests__" || e.name === "node_modules" ? [] : files(p);
    return /\.tsx?$/.test(e.name) ? [p] : [];
  });
}

function bindingNames(name: ts.BindingName, out: string[]) {
  if (ts.isIdentifier(name)) out.push(name.text);
  else for (const el of name.elements) if (!ts.isOmittedExpression(el)) bindingNames(el.name, out);
}

type Fn = { name: string; node: ts.FunctionLikeDeclaration };

// Top-level functions, as in action-scope-inventory.test.ts, without
// functions passed to a wrapper call.
function topLevelFunctions(sf: ts.SourceFile): Fn[] {
  const out: Fn[] = [];
  for (const stmt of sf.statements) {
    if (ts.isFunctionDeclaration(stmt) && stmt.body) out.push({ name: stmt.name?.text ?? "default", node: stmt });
    if (ts.isVariableStatement(stmt)) {
      for (const d of stmt.declarationList.declarations) {
        if (!ts.isIdentifier(d.name) || !d.initializer) continue;
        if (ts.isArrowFunction(d.initializer) || ts.isFunctionExpression(d.initializer)) {
          out.push({ name: d.name.text, node: d.initializer });
        }
      }
    }
  }
  return out;
}

// Names that hold client input: the parameters, plus local aliases and rest
// spreads taken from them.
function taintedNames(fn: ts.FunctionLikeDeclaration): Set<string> {
  const tainted = new Set<string>();
  for (const p of fn.parameters) {
    const names: string[] = [];
    bindingNames(p.name, names);
    names.forEach((n) => tainted.add(n));
  }
  const decls: ts.VariableDeclaration[] = [];
  const collect = (n: ts.Node) => {
    if (ts.isVariableDeclaration(n) && n.initializer) decls.push(n);
    ts.forEachChild(n, collect);
  };
  if (fn.body) collect(fn.body);
  for (let changed = true; changed; ) {
    changed = false;
    for (const d of decls) {
      if (!isRaw(d.initializer!, tainted)) continue;
      const names: string[] = [];
      if (ts.isIdentifier(d.name)) names.push(d.name.text);
      else if (ts.isObjectBindingPattern(d.name)) {
        // const { a, ...rest } = input: only the rest object is raw
        for (const el of d.name.elements) if (el.dotDotDotToken) bindingNames(el.name, names);
      }
      for (const n of names) if (!tainted.has(n)) { tainted.add(n); changed = true; }
    }
  }
  return tainted;
}

// Is this expression the client's object (or a spread of it)?
function isRaw(e: ts.Expression, tainted: Set<string>): boolean {
  while (ts.isParenthesizedExpression(e) || ts.isAsExpression(e) || ts.isNonNullExpression(e) || ts.isSatisfiesExpression(e)) {
    e = e.expression;
  }
  if (ts.isIdentifier(e)) return tainted.has(e.text);
  if (ts.isPropertyAccessExpression(e) || ts.isElementAccessExpression(e)) {
    let root: ts.Expression = e;
    while (ts.isPropertyAccessExpression(root) || ts.isElementAccessExpression(root)) root = root.expression;
    return ts.isIdentifier(root) && tainted.has(root.text);
  }
  if (ts.isObjectLiteralExpression(e)) {
    return e.properties.some((p) => ts.isSpreadAssignment(p) && isRaw(p.expression, tainted));
  }
  return false;
}

function scanSource(file: string, src: string): string[] {
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true);
  const first = sf.statements[0];
  if (!(first && ts.isExpressionStatement(first) && ts.isStringLiteral(first.expression) && first.expression.text === "use server")) {
    return [];
  }
  const hits = new Set<string>();
  for (const f of topLevelFunctions(sf)) {
    const tainted = taintedNames(f.node);
    const visit = (n: ts.Node) => {
      if (
        ts.isCallExpression(n) &&
        ts.isPropertyAccessExpression(n.expression) &&
        WRITE_METHODS.has(n.expression.name.text) &&
        n.arguments[0] &&
        ts.isObjectLiteralExpression(n.arguments[0])
      ) {
        for (const prop of n.arguments[0].properties) {
          if (!ts.isPropertyAssignment(prop) && !ts.isShorthandPropertyAssignment(prop)) continue;
          if (!ts.isIdentifier(prop.name) || !DATA_KEYS.has(prop.name.text)) continue;
          const value = ts.isPropertyAssignment(prop) ? prop.initializer : prop.name;
          if (isRaw(value, tainted)) hits.add(`${file}#${f.name}`);
        }
      }
      ts.forEachChild(n, visit);
    };
    if (f.node.body) visit(f.node.body);
  }
  return Array.from(hits);
}

function scan(): string[] {
  const out: string[] = [];
  for (const dir of ["actions", "app"]) {
    for (const file of files(path.join(ROOT, dir))) {
      const rel = path.relative(ROOT, file).split(path.sep).join("/");
      out.push(...scanSource(rel, fs.readFileSync(file, "utf8")));
    }
  }
  return out.sort();
}

describe("the scan", () => {
  const hit = (body: string) => scanSource("x.ts", `"use server";\n${body}`);

  it.each([
    ["the parameter as data", `export async function f(id: string, data: object) { return prismadb.t.update({ where: { id }, data }); }`],
    ["a spread of the parameter", `export const f = async (input: object) => prismadb.t.create({ data: { ...input, createdBy: "u" } });`],
    ["a property of the parameter", `export async function f(args: { patch: object }) { await prismadb.t.update({ where: { id: "1" }, data: args.patch }); }`],
    ["a rest spread from the parameter", `export async function f(input: { id: string }) { const { id, ...rest } = input; await prismadb.t.update({ where: { id }, data: rest }); }`],
    ["an alias of the parameter", `export async function f(input: object) { const payload = input as never; await tx.t.createMany({ data: payload }); }`],
    ["createManyAndReturn", `export async function f(rows: object[]) { await prismadb.t.createManyAndReturn({ data: rows }); }`],
    ["the upsert create and update", `export async function f(input: object) { await prismadb.t.upsert({ where: { id: "1" }, create: { ...input }, update: {} }); }`],
  ])("flags %s", (_label, body) => {
    expect(hit(body)).toEqual(["x.ts#f"]);
  });

  it.each([
    ["parsed data", `export async function f(data: unknown) { const parsed = schema.safeParse(data); if (!parsed.success) return; await prismadb.t.update({ where: { id: "1" }, data: parsed.data }); }`],
    ["picked fields", `export async function f(input: { name: string }) { await prismadb.t.create({ data: { name: input.name } }); }`],
    ["server-built data", `export async function f(id: string) { await prismadb.t.update({ where: { id }, data: { deletedAt: new Date() } }); }`],
  ])("passes %s", (_label, body) => {
    expect(hit(body)).toEqual([]);
  });

  it("ignores files that are not server actions", () => {
    expect(scanSource("x.ts", `export async function f(data: object) { await prismadb.t.create({ data }); }`)).toEqual([]);
  });
});

const hits = scan();

it("no server action passes raw client input as Prisma data, or it is reviewed", () => {
  expect(hits.filter((k) => !Object.hasOwn(REVIEWED, k))).toEqual([]);
});

it("the inventory has no entries for actions the scan no longer flags", () => {
  expect(Object.keys(REVIEWED).filter((k) => !hits.includes(k))).toEqual([]);
});
