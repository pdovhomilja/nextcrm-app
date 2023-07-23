import Container from "../../components/ui/Container";
import OpportunityView from "./components/OpportunityView";

const AccountsPage = async () => {
  return (
    <Container
      title="Opportunities"
      description={"Everything you need to know about your accounts"}
    >
      <div>
        <OpportunityView />
      </div>
    </Container>
  );
};

export default AccountsPage;
