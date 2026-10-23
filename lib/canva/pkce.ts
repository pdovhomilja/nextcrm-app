import { createHash, randomBytes } from "crypto";

/** PKCE verifier: 43–128 chars from the unreserved set. */
export function createCodeVerifier(): string {
  return randomBytes(48).toString("base64url");
}

/** S256 challenge: base64url(SHA-256(verifier)), no padding. */
export function codeChallengeS256(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}
