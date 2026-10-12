jest.mock("@/lib/authz", () => {
  class AuthenticationError extends Error {}
  class AuthorizationError extends Error {}
  return {
    requireRole: jest.fn(),
    AuthenticationError,
    AuthorizationError,
  };
});
jest.mock("@/lib/crm/calendar/calendly-settings", () => ({
  getCalendlySettings: jest.fn(),
  saveCalendlySettings: jest.fn(),
  setCalendlyWebhookUri: jest.fn(),
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

import { requireRole, AuthenticationError, AuthorizationError } from "@/lib/authz";
import {
  getCalendlySettings,
  saveCalendlySettings,
  setCalendlyWebhookUri,
} from "@/lib/crm/calendar/calendly-settings";
import { revalidatePath } from "next/cache";
import { saveCalendlyAction, subscribeCalendlyWebhook } from "../calendly";

const mockRequireRole = requireRole as jest.MockedFunction<typeof requireRole>;
const mockGetCalendlySettings = getCalendlySettings as jest.MockedFunction<
  typeof getCalendlySettings
>;
const mockSetCalendlyWebhookUri = setCalendlyWebhookUri as jest.MockedFunction<
  typeof setCalendlyWebhookUri
>;
const mockSaveCalendlySettings = saveCalendlySettings as jest.MockedFunction<
  typeof saveCalendlySettings
>;

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}

const EXISTING_WEBHOOK_URI = "https://api.calendly.com/webhook_subscriptions/old-uuid";
const NEW_WEBHOOK_URI = "https://api.calendly.com/webhook_subscriptions/new-uuid";

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn();
});

describe("subscribeCalendlyWebhook", () => {
  it("returns an error result when the caller is not an admin", async () => {
    mockRequireRole.mockRejectedValue(new AuthorizationError("Forbidden"));

    const result = await subscribeCalendlyWebhook();

    expect(result).toEqual({ ok: false, error: "Forbidden" });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("returns an error when no API token is saved", async () => {
    mockRequireRole.mockResolvedValue({ id: "admin-1", role: "admin" } as any);
    mockGetCalendlySettings.mockResolvedValue({
      apiToken: null,
      signingKey: null,
      webhookUri: null,
    });

    const result = await subscribeCalendlyWebhook();

    expect(result).toEqual({ ok: false, error: "Save the API token first." });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("deletes the prior subscription before creating a new one", async () => {
    mockRequireRole.mockResolvedValue({ id: "admin-1", role: "admin" } as any);
    mockGetCalendlySettings.mockResolvedValue({
      apiToken: "token-123",
      signingKey: null,
      webhookUri: EXISTING_WEBHOOK_URI,
    });

    const fetchMock = global.fetch as jest.Mock;
    fetchMock
      .mockResolvedValueOnce(jsonResponse(204, {})) // DELETE old subscription
      .mockResolvedValueOnce(
        jsonResponse(200, { resource: { current_organization: "org-1" } }),
      ) // GET /users/me
      .mockResolvedValueOnce(
        jsonResponse(200, { resource: { uri: NEW_WEBHOOK_URI } }),
      ); // POST new subscription

    const result = await subscribeCalendlyWebhook();

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      EXISTING_WEBHOOK_URI,
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(mockSetCalendlyWebhookUri).toHaveBeenCalledWith(NEW_WEBHOOK_URI);
    expect(result).toEqual({ ok: true });
  });

  it("treats a 404 on the prior subscription as already gone and proceeds", async () => {
    mockRequireRole.mockResolvedValue({ id: "admin-1", role: "admin" } as any);
    mockGetCalendlySettings.mockResolvedValue({
      apiToken: "token-123",
      signingKey: null,
      webhookUri: EXISTING_WEBHOOK_URI,
    });

    const fetchMock = global.fetch as jest.Mock;
    fetchMock
      .mockResolvedValueOnce(jsonResponse(404, {})) // DELETE: already gone
      .mockResolvedValueOnce(
        jsonResponse(200, { resource: { current_organization: "org-1" } }),
      )
      .mockResolvedValueOnce(
        jsonResponse(200, { resource: { uri: NEW_WEBHOOK_URI } }),
      );

    const result = await subscribeCalendlyWebhook();

    expect(result).toEqual({ ok: true });
    expect(mockSetCalendlyWebhookUri).toHaveBeenCalledWith(NEW_WEBHOOK_URI);
  });

  it("does not create a new subscription when deleting the prior one fails unexpectedly", async () => {
    mockRequireRole.mockResolvedValue({ id: "admin-1", role: "admin" } as any);
    mockGetCalendlySettings.mockResolvedValue({
      apiToken: "token-123",
      signingKey: null,
      webhookUri: EXISTING_WEBHOOK_URI,
    });

    const fetchMock = global.fetch as jest.Mock;
    fetchMock.mockResolvedValueOnce(jsonResponse(500, {})); // DELETE fails

    const result = await subscribeCalendlyWebhook();

    expect(result).toEqual({
      ok: false,
      error: "Failed to remove previous subscription (500)",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(mockSetCalendlyWebhookUri).not.toHaveBeenCalled();
  });

  it("skips the delete step entirely when there is no prior subscription", async () => {
    mockRequireRole.mockResolvedValue({ id: "admin-1", role: "admin" } as any);
    mockGetCalendlySettings.mockResolvedValue({
      apiToken: "token-123",
      signingKey: null,
      webhookUri: null,
    });

    const fetchMock = global.fetch as jest.Mock;
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse(200, { resource: { current_organization: "org-1" } }),
      )
      .mockResolvedValueOnce(
        jsonResponse(200, { resource: { uri: NEW_WEBHOOK_URI } }),
      );

    const result = await subscribeCalendlyWebhook();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(result).toEqual({ ok: true });
  });
});

describe("subscribeCalendlyWebhook signing key", () => {
  function mockCalendly() {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(
        jsonResponse(200, { resource: { current_organization: "org-1" } }),
      )
      .mockResolvedValueOnce(
        jsonResponse(200, { resource: { uri: NEW_WEBHOOK_URI } }),
      );
  }
  function sentBody() {
    const [, init] = (global.fetch as jest.Mock).mock.calls[1];
    return JSON.parse(init.body);
  }

  it("generates, saves and sends a signing key when none is saved", async () => {
    mockRequireRole.mockResolvedValue({ id: "admin-1", role: "admin" } as any);
    mockGetCalendlySettings.mockResolvedValue({
      apiToken: "token-123",
      signingKey: null,
      webhookUri: null,
    });
    mockCalendly();

    const result = await subscribeCalendlyWebhook();

    expect(result).toEqual({ ok: true });
    const { signing_key } = sentBody();
    expect(signing_key).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(mockSaveCalendlySettings).toHaveBeenCalledWith({ signingKey: signing_key });
  });

  it("sends the saved signing key without replacing it", async () => {
    mockRequireRole.mockResolvedValue({ id: "admin-1", role: "admin" } as any);
    mockGetCalendlySettings.mockResolvedValue({
      apiToken: "token-123",
      signingKey: "saved-key",
      webhookUri: null,
    });
    mockCalendly();

    await subscribeCalendlyWebhook();

    expect(sentBody().signing_key).toBe("saved-key");
    expect(mockSaveCalendlySettings).not.toHaveBeenCalled();
  });
});

describe("saveCalendlyAction", () => {
  it("returns an error result instead of throwing when the caller is not authenticated", async () => {
    mockRequireRole.mockRejectedValue(new AuthenticationError("Unauthorized"));

    const result = await saveCalendlyAction(form({ apiToken: "token" }));

    expect(result).toEqual({ ok: false, error: "Unauthorized" });
    expect(mockSaveCalendlySettings).not.toHaveBeenCalled();
  });

  it("returns an error result instead of throwing when the caller is not an admin", async () => {
    mockRequireRole.mockRejectedValue(new AuthorizationError("Forbidden"));

    const result = await saveCalendlyAction(form({ apiToken: "token" }));

    expect(result).toEqual({ ok: false, error: "Forbidden" });
    expect(mockSaveCalendlySettings).not.toHaveBeenCalled();
  });

  it("saves the settings and returns ok for an admin", async () => {
    mockRequireRole.mockResolvedValue({ id: "admin-1", role: "admin" } as any);
    mockSaveCalendlySettings.mockResolvedValue(undefined);

    const result = await saveCalendlyAction(
      form({ apiToken: "token-value", signingKey: "signing-value" })
    );

    expect(result).toEqual({ ok: true });
    expect(mockSaveCalendlySettings).toHaveBeenCalledWith({
      apiToken: "token-value",
      signingKey: "signing-value",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/calendar-settings");
  });

  it("returns an error result instead of throwing when saving fails", async () => {
    mockRequireRole.mockResolvedValue({ id: "admin-1", role: "admin" } as any);
    mockSaveCalendlySettings.mockRejectedValue(new Error("Database unavailable"));

    const result = await saveCalendlyAction(form({ apiToken: "token" }));

    expect(result).toEqual({ ok: false, error: "Database unavailable" });
  });
});
