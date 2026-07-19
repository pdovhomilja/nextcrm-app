import { redirect } from "next/navigation";
import Container from "../../components/ui/Container";
import {
  requireRole,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";
import { getPendingApprovals } from "@/actions/crm/opportunities/get-pending-approvals";
import ApprovalsTable from "./components/ApprovalsTable";

const ApprovalsPage = async () => {
  try {
    await requireRole(["manager", "admin"]);
  } catch (e) {
    if (e instanceof AuthenticationError) redirect("/sign-in");
    if (e instanceof AuthorizationError) redirect("/");
    throw e;
  }
  const pending = await getPendingApprovals();
  const rows = Array.isArray(pending) ? pending : [];
  return (
    <Container
      title="Quote approvals"
      description="Deals waiting for a quote/SOW decision"
    >
      <ApprovalsTable rows={rows} />
    </Container>
  );
};

export default ApprovalsPage;
