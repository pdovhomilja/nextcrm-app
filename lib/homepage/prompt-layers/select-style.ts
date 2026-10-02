/**
 * Compute FNV-1a hash of UTF-8 bytes.
 * Deterministic, order-independent hash for stable style selection.
 */
function fnv1a(data: Uint8Array): number {
  let hash = 2166136261; // FNV offset basis for 32-bit
  const FNV_PRIME = 16777619;

  for (let i = 0; i < data.length; i++) {
    hash ^= data[i];
    hash = (hash * FNV_PRIME) >>> 0; // Keep as 32-bit unsigned
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
