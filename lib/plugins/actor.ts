import { AsyncLocalStorage } from "node:async_hooks";
import type { Actor } from "@nextcrm/plugin-sdk";

export interface ActorFrame { actor: Actor; depth: number }

export const actorStorage = new AsyncLocalStorage<ActorFrame>();

export function currentActorFrame(): ActorFrame | undefined {
  return actorStorage.getStore();
}

export function runAsActor<T>(actor: Actor, fn: () => T): T {
  const parent = actorStorage.getStore();
  const depth = actor.type === "plugin" ? (parent?.depth ?? 0) + 1 : parent?.depth ?? 0;
  return actorStorage.run({ actor, depth }, fn);
}

/** Actor for the current write: explicit frame, else the session user, else system. */
export async function resolveActor(): Promise<Actor> {
  const frame = actorStorage.getStore();
  if (frame) return frame.actor;
  try {
    const { requireAuthenticated } = await import("@/lib/authz");
    const user = await requireAuthenticated();
    return { type: "user", userId: user.id, role: user.role };
  } catch {
    return { type: "system" };
  }
}
