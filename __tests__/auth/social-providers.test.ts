import { socialProvidersConfig } from "@/lib/auth-social";

describe("socialProvidersConfig — Google gating", () => {
  it("registers google when both id and secret are provided", () => {
    const providers = socialProvidersConfig("gid", "gsecret");
    expect(providers.google).toEqual({ clientId: "gid", clientSecret: "gsecret" });
  });

  it("omits google when either credential is missing", () => {
    expect(socialProvidersConfig("gid", undefined).google).toBeUndefined();
    expect(socialProvidersConfig(undefined, "gsecret").google).toBeUndefined();
  });

  it("omits google when both are unset (Google sign-in disabled)", () => {
    expect(socialProvidersConfig(undefined, undefined)).toEqual({});
  });
});
