"use server";
import { listPrompts, type AiPromptKind } from "./list-prompts";

export const listPromptBodies = async ({ kind }: { kind: AiPromptKind }) => {
  const prompts = await listPrompts({ kind });
  return prompts.map((p) => ({ id: p.id, name: p.name, body: p.body }));
};
