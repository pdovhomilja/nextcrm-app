import { Heading, Text } from "@react-email/components";

import { VensaiEmailShell } from "@/emails/components/VensaiEmailShell";
import { emailHeading, emailText } from "@/emails/components/transactional-email-styles";
import { getProductName } from "@/lib/brand/vensai";

type ScheduledReportProps = { reportName: string; dateRange: string };

export default function ScheduledReport({
  reportName = "Report",
  dateRange = "",
}: ScheduledReportProps) {
  const product = getProductName();

  return (
    <VensaiEmailShell preview={`Your scheduled report: ${reportName}`}>
      <Heading style={emailHeading}>{reportName}</Heading>
      {dateRange ? (
        <Text style={{ ...emailText, color: "#64748b" }}>Date range: {dateRange}</Text>
      ) : null}
      <Text style={emailText}>Your scheduled report is attached to this email.</Text>
      <Text style={{ ...emailText, fontSize: 12, color: "#64748b" }}>
        Automated report from {product}.
      </Text>
    </VensaiEmailShell>
  );
}
