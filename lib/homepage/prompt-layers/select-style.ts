/**
 * Compute FNV-1a hash of UTF-8 bytes.
 * Deterministic, order-independent hash for stable style selection.
 */
function fnv1a(data: Uint8Array): number {
  let hash = 2166136261; // FNV offset basis for 32-bit
  const FNV_PRIME = 16777619;

  for (let i = 0; i < data.length; i++) {
    hash ^= data[i];
    hash = Math.imul(hash, FNV_PRIME) >>> 0; // 32-bit multiply (no float precision loss)
  }

  return hash >>> 0; // Ensure unsigned 32-bit
}

/**
 * Pick a style deterministically based on a seed.
 * Uses FNV-1a hash over UTF-8 bytes of the seed.
 * Sorts styles by id before indexing to ensure order-independence.
 *
 * @param seed - The seed string (e.g., target ID) to hash
 * @param styles - Array of styles with id and body
 * @returns A single style picked deterministically, or null if the array is empty
 */
export function pickStyleDirection(
  seed: string,
  styles: { id: string; body: string }[]
): { id: string; body: string } | null {
  if (styles.length === 0) return null;

  // Convert seed to UTF-8 bytes
  const encoder = new TextEncoder();
  const seedBytes = encoder.encode(seed);

  // Calculate FNV-1a hash
  const hash = fnv1a(seedBytes);

  // Sort by id to ensure order-independence
  const sorted = [...styles].sort((a, b) => a.id.localeCompare(b.id));

  // Pick based on hash modulo length
  const index = hash % sorted.length;

  return sorted[index];
}

/**
 * Resolve the style card for a generation, with precedence:
 *
 *   1. `overrideId` — the operator's explicit pick in the drawer for THIS run. When
 *      it matches a live style it wins, and the caller persists it as the target's
 *      remembered style.
 *   2. `rememberedId` — the style previously chosen/snapshotted for this target.
 *      Reused so the style does NOT change on its own across generate/refine.
 *   3. deterministic {@link pickStyleDirection} hash — only when nothing is picked
 *      and nothing is remembered (first generate). The caller snapshots the result
 *      so it, too, stays stable thereafter (even when the style library changes).
 *
 * An unknown/stale id at any step falls through to the next. Returns null only when
 * there are no styles.
 *
 * @param seed - Stable per-target seed (the homepage id).
 * @param styles - Active style cards (id + body).
 * @param opts.overrideId - Operator-selected style id for this run, or null for auto.
 * @param opts.rememberedId - The target's persisted style id, or null if none yet.
 * @returns The chosen style, or null when there are no styles.
 */
export function resolveStyleDirection(
  seed: string,
  styles: { id: string; body: string }[],
  opts?: { overrideId?: string | null; rememberedId?: string | null }
): { id: string; body: string } | null {
  const byId = (id?: string | null) => (id ? styles.find((s) => s.id === id) : undefined);
  // 1. Explicit operator pick for this run.
  const override = byId(opts?.overrideId);
  if (override) return override;
  // 2. The style remembered for this target.
  const remembered = byId(opts?.rememberedId);
  if (remembered) return remembered;
  // 3. First generate with no pick: deterministic auto pick (caller snapshots it).
  return pickStyleDirection(seed, styles);
}
