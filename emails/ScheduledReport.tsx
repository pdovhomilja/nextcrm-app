import { Body, Container, Head, Heading, Hr, Html, Preview, Text } from "@react-email/components";

type ScheduledReportProps = { reportName: string; dateRange: string };

export default function ScheduledReport({ reportName = "Report", dateRange = "" }: ScheduledReportProps) {
  return (
    <Html>
      <Head />
      <Preview>Your scheduled report: {reportName}</Preview>
      <Body style={{ fontFamily: "sans-serif", padding: "20px" }}>
        <Container>
          <Heading as="h2">{reportName}</Heading>
          {dateRange && <Text style={{ color: "#666" }}>Date range: {dateRange}</Text>}
          <Hr />
          <Text>Your scheduled report is attached to this email.</Text>
          <Text style={{ color: "#999", fontSize: "12px" }}>This is an automated report from NextCRM.</Text>
        </Container>
      </Body>
    </Html>
  );
}
