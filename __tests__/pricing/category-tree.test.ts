import { categoryOptionsFor } from "@/app/[locale]/(routes)/admin/crm-settings/_components/category-tree";

const cats = [
  { id: "a", name: "A", parentId: null }, { id: "b", name: "B", parentId: "a" },
  { id: "c", name: "C", parentId: "b" }, { id: "d", name: "D", parentId: null },
];

it("offers every category except itself and its descendants", () => {
  expect(categoryOptionsFor("b", cats).map((c) => c.id)).toEqual(["a", "d"]);
  expect(categoryOptionsFor(null, cats).map((c) => c.id)).toEqual(["a", "b", "c", "d"]);
});
