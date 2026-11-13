// Shared auth and error handling for the opportunity actions. No "use server" here:
// this helper must not become an endpoint of its own.
import { revalidatePath } from "next/cache";
import { pluginRuleErrorMessage } from "@/lib/plugins/action-errors";
import { requireAuthenticated, AuthenticationError } from "@/lib/authz";
import type { AuthzUser } from "@/lib/authz";
import { OpportunityError, opportunityErrorMessage } from "@/lib/crm/opportunities/types";

type Options = {
  verb: "create" | "update" | "delete" | "restore";
  auth?: Parameters<typeof requireAuthenticated>[0];
  pluginRules?: boolean;
  alsoRevalidate?: string;
};

// `error?: undefined` keeps `res.error` readable on success, as callers use it.
type Result<T> = (T & { error?: undefined }) | { error: string };

export async function runOpportunityAction<T>(
  { verb, auth, pluginRules = true, alsoRevalidate }: Options,
  fn: (user: AuthzUser) => Promise<T>,
): Promise<Result<T>> {
  let user: AuthzUser;
  try { user = await requireAuthenticated(auth); } catch (e) { if (e instanceof AuthenticationError) return { error: "Unauthorized" }; throw e; }
  try {
    const result = await fn(user);
    revalidatePath("/[locale]/(routes)/crm/opportunities", "page");
    if (alsoRevalidate) revalidatePath(alsoRevalidate, "page");
    return result as T & { error?: undefined };
  } catch (error) {
    if (error instanceof OpportunityError) return { error: opportunityErrorMessage(error) };
    const ruleMessage = pluginRules ? await pluginRuleErrorMessage(error) : null;
    if (ruleMessage) return { error: ruleMessage };
    console.log(`[${verb.toUpperCase()}_OPPORTUNITY]`, error);
    return { error: `Failed to ${verb} opportunity` };
  }
}
