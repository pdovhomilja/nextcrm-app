import { NextRequest, NextResponse } from "next/server";
import {
  requireAuthenticated,
  unauthorizedResponse,
  forbiddenResponse,
  AuthenticationError,
  getReportScope,
  type ReportScope,
} from "@/lib/authz";
import {
  parseSearchParamsToFilters,
  REPORT_CATEGORIES,
  type ReportCategory,
} from "@/actions/reports/types";
import { generateCSV } from "@/actions/reports/export-csv";
import * as salesActions from "@/actions/reports/sales";
import * as leadsActions from "@/actions/reports/leads";
import * as accountsActions from "@/actions/reports/accounts";
import * as activityActions from "@/actions/reports/activity";
import * as campaignsActions from "@/actions/reports/campaigns";
import * as usersActions from "@/actions/reports/users";

async function getReportData(
  category: string,
  filters: ReturnType<typeof parseSearchParamsToFilters>,
  scope: ReportScope,
) {
  switch (category) {
    case "sales":
      return {
        data: await salesActions.getOppsByMonth(filters, scope),
        headers: ["Month", "Opportunities"],
      };
    case "leads":
      return {
        data: await leadsActions.getNewLeads(filters, scope),
        headers: ["Month", "Leads"],
      };
    case "accounts":
      return {
        data: await accountsActions.getNewAccounts(filters, scope),
        headers: ["Month", "Accounts"],
      };
    case "activity":
      return {
        data: await activityActions.getTasksByAssignee(filters, scope),
        headers: ["Assignee", "Tasks"],
      };
    case "campaigns": {
      const perf = await campaignsActions.getCampaignPerformance(
        filters,
        scope,
      );
      return {
        data: [
          { name: "Sent", Number: perf.sent },
          { name: "Opened", Number: perf.opened },
          { name: "Clicked", Number: perf.clicked },
        ],
        headers: ["Metric", "Count"],
      };
    }
    case "users":
      return {
        data: await usersActions.getUserGrowth(filters),
        headers: ["Month", "Users"],
      };
    default:
      return { data: [], headers: ["Name", "Value"] };
  }
}

export async function GET(request: NextRequest) {
  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return unauthorizedResponse();
    throw e;
  }

  const { searchParams } = request.nextUrl;
  const category = searchParams.get("category") ?? "sales";
  const format = searchParams.get("format") ?? "csv";

  if (!REPORT_CATEGORIES.includes(category as ReportCategory)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  if (category === "users" && user.role === "user") {
    return forbiddenResponse();
  }

  const filters = parseSearchParamsToFilters(searchParams);
  const scope = getReportScope(user);

  if (format === "csv") {
    const { data, headers } = await getReportData(category, filters, scope);
    const csv = generateCSV(data, headers);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${category}-report.csv"`,
      },
    });
  }

  if (format === "pdf") {
    const { generatePDF } = await import("@/actions/reports/export-pdf");
    const { data, headers } = await getReportData(category, filters, scope);
    const dateRange = `${searchParams.get("from") ?? "all"} to ${searchParams.get("to") ?? "now"}`;
    const buffer = await generatePDF(
      `${category.charAt(0).toUpperCase() + category.slice(1)} Report`,
      dateRange,
      data,
      headers as [string, string],
    );
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${category}-report.pdf"`,
      },
    });
  }

  return NextResponse.json({ error: "Unknown format" }, { status: 400 });
}
