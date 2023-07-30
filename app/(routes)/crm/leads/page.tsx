import Container from "../../components/ui/Container";
import LeadView from "./components/LeadView";

const LeadsPage = async () => {
  return (
    <Container
      title="Leads"
      description={"Everything you need to know about your leads"}
    >
      <div>
        <LeadView />
      </div>
    </Container>
  );
};

export default LeadsPage;
