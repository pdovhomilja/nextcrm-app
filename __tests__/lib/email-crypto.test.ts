import { encrypt, decrypt } from "@/lib/email-crypto";

describe("email-crypto", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      EMAIL_ENCRYPTION_KEY: "a".repeat(64),
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("encrypt returns a non-empty string different from input", () => {
    const result = encrypt("mysecretpassword");
    expect(typeof result).toBe("string");
    expect(result).not.toBe("mysecretpassword");
    expect(result.length).toBeGreaterThan(0);
  });

  it("decrypt reverses encrypt", () => {
    const plaintext = "mysecretpassword";
    const ciphertext = encrypt(plaintext);
    expect(decrypt(ciphertext)).toBe(plaintext);
  });

  it("two encryptions of same value produce different ciphertexts (random IV)", () => {
    const a = encrypt("same");
    const b = encrypt("same");
    expect(a).not.toBe(b);
  });

  it("throws if EMAIL_ENCRYPTION_KEY is missing", () => {
    delete process.env.EMAIL_ENCRYPTION_KEY;
    expect(() => encrypt("x")).toThrow("EMAIL_ENCRYPTION_KEY");
  });

  it("throws if EMAIL_ENCRYPTION_KEY is wrong length", () => {
    process.env.EMAIL_ENCRYPTION_KEY = "short";
    expect(() => encrypt("x")).toThrow("EMAIL_ENCRYPTION_KEY");
  });

  it("throws if EMAIL_ENCRYPTION_KEY contains non-hex characters", () => {
    process.env.EMAIL_ENCRYPTION_KEY = "z".repeat(64); // valid length, invalid hex
    expect(() => encrypt("x")).toThrow("EMAIL_ENCRYPTION_KEY");
  });
});
