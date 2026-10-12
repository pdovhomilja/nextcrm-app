import type { RecordData } from "@nextcrm/plugin-sdk";
import { runSync } from "../sync";
import { K } from "../store";
import { company, mk, now, person } from "./helpers";

it("imports people under linked customers as contacts and updates them in place (Review Focus 1)", async () => {
  const accounts: RecordData[] = [];
  const partners: RecordData[] = [company(1), person(11, 1, { function: "Buyer", phone: "1" }), person(12, 1, { name: "Eva" }), person(13, 99)];
  const { ctx, client } = mk(partners, accounts);
  await runSync(ctx, client, now);
  const contacts = await ctx.data.contacts.find({});
  expect(contacts.map((c) => [c.first_name, c.last_name, c.position, c.accountsIDs])).toEqual([
    ["Jan", "Person11", "Buyer", accounts[0].id], [null, "Eva", null, accounts[0].id],
  ]);
  partners[1].write_date = "2026-10-13 07:59:00";
  partners[1].function = "Head buyer";
  await runSync(ctx, client, new Date(now.getTime() + 60_000));
  const again = await ctx.data.contacts.find({});
  expect(again).toHaveLength(2);
  expect(again.find((c) => c.last_name === "Person11")?.position).toBe("Head buyer");
  expect(await ctx.store.get(K.contact(13))).toBeNull();   // its customer is not synced
});

it("links an existing contact with the same email instead of creating one", async () => {
  const accounts: RecordData[] = [{ id: "a1", name: "Co", company_id: "27082440", deletedAt: null }];
  const { ctx, client } = mk([company(1, { company_registry: "27082440" }), person(11, 1, { email: "known@x.example" })], accounts);
  await ctx.data.contacts.create({ last_name: "Known", email: "known@x.example", accountsIDs: "a1" });
  await runSync(ctx, client, now);
  expect(await ctx.data.contacts.find({})).toHaveLength(1);
  expect(await ctx.store.get(K.contact(11))).toEqual({ contactId: expect.any(String) });
});
