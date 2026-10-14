import {
  getBootstrapAdminEmail,
  getBootstrapAdminSeedConfig,
} from "@/lib/bootstrap-admin-config";

const ORIGINAL_ENV = process.env;

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
  delete process.env.BOOTSTRAP_ADMIN_EMAIL;
  delete process.env.BOOTSTRAP_ADMIN_WORK_EMAIL;
  delete process.env.BOOTSTRAP_ADMIN_PASSWORD;
});

afterAll(() => {
  process.env = ORIGINAL_ENV;
});

describe("bootstrap admin config", () => {
  it("defaults personal and work email", () => {
    expect(getBootstrapAdminEmail()).toBe("jaybabu0610@gmail.com");
    expect(getBootstrapAdminSeedConfig().workEmail).toBe("ceo@vensailabs.in");
  });

  it("reads overrides from env", () => {
    process.env.BOOTSTRAP_ADMIN_EMAIL = " Admin@Example.com ";
    process.env.BOOTSTRAP_ADMIN_WORK_EMAIL = "work@example.com";
    expect(getBootstrapAdminSeedConfig()).toMatchObject({
      email: "admin@example.com",
      workEmail: "work@example.com",
    });
  });
});
