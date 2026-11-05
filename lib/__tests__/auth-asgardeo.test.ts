jest.mock("better-auth", () => ({
  betterAuth: jest.fn((options) => ({
    $Infer: { Session: {} },
    options,
  })),
}));

jest.mock("better-auth/adapters/prisma", () => ({
  prismaAdapter: jest.fn(() => ({ id: "prisma-adapter" })),
}));

jest.mock("better-auth/plugins", () => ({
  emailOTP: jest.fn(() => ({ id: "email-otp" })),
  testUtils: jest.fn(() => ({ id: "test-utils" })),
  admin: jest.fn(() => ({ id: "admin" })),
}));

jest.mock("better-auth/plugins/generic-oauth", () => ({
  genericOAuth: jest.fn((options) => ({
    id: "generic-oauth",
    options,
  })),
}));

jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: {
      count: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

jest.mock("@/lib/auth-permissions", () => ({
  ac: {},
  admin: {},
  manager: {},
  user: {},
  partner: {},
}));

jest.mock("@/lib/new-user-notify", () => ({
  newUserNotify: jest.fn(),
}));

jest.mock("@/lib/resend", () => ({
  __esModule: true,
  default: jest.fn(),
}));

const originalEnv = {
  clientId: process.env.ASGARDEO_CLIENT_ID,
  clientSecret: process.env.ASGARDEO_CLIENT_SECRET,
  discoveryUrl: process.env.ASGARDEO_DISCOVERY_URL,
};

function loadAuthConfiguration() {
  let result: {
    authOptions: any;
    genericOAuthCalls: any[];
  } | undefined;

  jest.isolateModules(() => {
    const betterAuth = require("better-auth").betterAuth;
    const genericOAuth = require("better-auth/plugins/generic-oauth").genericOAuth;

    require("../auth");

    result = {
      authOptions: betterAuth.mock.calls[0][0],
      genericOAuthCalls: genericOAuth.mock.calls,
    };
  });

  return result!;
}

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();

  delete process.env.ASGARDEO_CLIENT_ID;
  delete process.env.ASGARDEO_CLIENT_SECRET;
  delete process.env.ASGARDEO_DISCOVERY_URL;
});

afterEach(() => {
  if (originalEnv.clientId === undefined) {
    delete process.env.ASGARDEO_CLIENT_ID;
  } else {
    process.env.ASGARDEO_CLIENT_ID = originalEnv.clientId;
  }

  if (originalEnv.clientSecret === undefined) {
    delete process.env.ASGARDEO_CLIENT_SECRET;
  } else {
    process.env.ASGARDEO_CLIENT_SECRET = originalEnv.clientSecret;
  }

  if (originalEnv.discoveryUrl === undefined) {
    delete process.env.ASGARDEO_DISCOVERY_URL;
  } else {
    process.env.ASGARDEO_DISCOVERY_URL = originalEnv.discoveryUrl;
  }
});

describe("Asgardeo OAuth configuration", () => {
  it.each([
    "ASGARDEO_CLIENT_ID",
    "ASGARDEO_CLIENT_SECRET",
    "ASGARDEO_DISCOVERY_URL",
  ])("does not register Asgardeo when %s is missing", (missingVariable) => {
    process.env.ASGARDEO_CLIENT_ID = "test-client-id";
    process.env.ASGARDEO_CLIENT_SECRET = "test-client-secret";
    process.env.ASGARDEO_DISCOVERY_URL =
      "https://example.com/.well-known/openid-configuration";

    delete process.env[missingVariable];

    const { authOptions, genericOAuthCalls } = loadAuthConfiguration();

    expect(genericOAuthCalls).toHaveLength(0);
    expect(
      authOptions.plugins.some((plugin: any) => plugin.id === "generic-oauth"),
    ).toBe(false);
  });

  it("registers Asgardeo with the required OIDC security settings", () => {
    process.env.ASGARDEO_CLIENT_ID = "test-client-id";
    process.env.ASGARDEO_CLIENT_SECRET = "test-client-secret";
    process.env.ASGARDEO_DISCOVERY_URL =
      "https://example.com/.well-known/openid-configuration";

    const { authOptions, genericOAuthCalls } = loadAuthConfiguration();

    expect(genericOAuthCalls).toHaveLength(1);

    const oauthConfig = genericOAuthCalls[0][0].config[0];

    expect(oauthConfig).toMatchObject({
      providerId: "asgardeo",
      name: "Asgardeo",
      clientId: "test-client-id",
      clientSecret: "test-client-secret",
      discoveryUrl:
        "https://example.com/.well-known/openid-configuration",
      scopes: ["openid", "profile", "email"],
      pkce: true,
      authentication: "post",
      requireIdTokenVerification: true,
      requireEmailVerification: true,
    });

    expect(
      authOptions.plugins.some((plugin: any) => plugin.id === "generic-oauth"),
    ).toBe(true);
  });
});
