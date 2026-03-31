import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { parseSearchParamsToFilters } from "@/actions/reports/types";
import { generateCSV } from "@/actions/reports/export-csv";
import * as salesActions from "@/actions/reports/sales";
import * as leadsActions from "@/actions/reports/leads";
import * as accountsActions from "@/actions/reports/accounts";
import * as activityActions from "@/actions/reports/activity";
import * as campaignsActions from "@/actions/reports/campaigns";
import * as usersActions from "@/actions/reports/users";

async function getReportData(category: string, filters: ReturnType<typeof parseSearchParamsToFilters>) {
  switch (category) {
    case "sales":
      return { data: await salesActions.getOppsByMonth(filters), headers: ["Month", "Opportunities"] };
    case "leads":
      return { data: await leadsActions.getNewLeads(filters), headers: ["Month", "Leads"] };
    case "accounts":
      return { data: await accountsActions.getNewAccounts(filters), headers: ["Month", "Accounts"] };
    case "activity":
      return { data: await activityActions.getTasksByAssignee(filters), headers: ["Assignee", "Tasks"] };
    case "campaigns": {
      const perf = await campaignsActions.getCampaignPerformance(filters);
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
      return { data: await usersActions.getUserGrowth(filters), headers: ["Month", "Users"] };
    default:
      return { data: [], headers: ["Name", "Value"] };
  }
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const category = searchParams.get("category") ?? "sales";
  const format = searchParams.get("format") ?? "csv";
  const filters = parseSearchParamsToFilters(searchParams);

  if (format === "csv") {
    const { data, headers } = await getReportData(category, filters);
    const csv = generateCSV(data, headers);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${category}-report.csv"`,
      },
    });
  }

  // PDF handled in Task 20
  return NextResponse.json({ error: "PDF export not yet implemented" }, { status: 501 });
}
