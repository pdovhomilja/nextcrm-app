import {
  provisioningAdminResponseSchema,
  type ProvisioningAdminRequest,
  type ProvisioningAdminResponse,
} from "@/lib/ventures/provisioning-contract";
import { assertAllowedVentureTargetUrl } from "@/lib/ventures/url-policy";

const PROVISIONING_PATH = "/api/internal/provisioning/admin";
const TIMEOUT_MS = 25_000;

export async function postProvisionAdminToTarget(input: {
  deploymentUrl: string;
  secret: string;
  body: ProvisioningAdminRequest;
}): Promise<{ ok: true; data: ProvisioningAdminResponse } | { ok: false; error: string; httpStatus?: number }> {
  const base = input.deploymentUrl.replace(/\/+$/, "");
  const url = `${base}${PROVISIONING_PATH}`;

  try {
    await assertAllowedVentureTargetUrl(url, { registeredDeploymentUrl: input.deploymentUrl });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Target URL not allowed." };
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input.body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      redirect: "manual",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Request failed.";
    return { ok: false, error: `Could not reach admin portal: ${msg}` };
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return {
      ok: false,
      error: "Admin portal returned a non-JSON response.",
      httpStatus: res.status,
    };
  }

  const parsed = provisioningAdminResponseSchema.safeParse(json);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Admin portal returned an unexpected response shape.",
      httpStatus: res.status,
    };
  }

  if (!res.ok && parsed.data.success === false) {
    return { ok: false, error: parsed.data.message, httpStatus: res.status };
  }

  if (!parsed.data.success) {
    return { ok: false, error: parsed.data.message, httpStatus: res.status };
  }

  return { ok: true, data: parsed.data };
}
