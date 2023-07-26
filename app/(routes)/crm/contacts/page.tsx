import Container from "../../components/ui/Container";
import ContactView from "./components/ContactView";
import OpportunityView from "./components/ContactView";

const AccountsPage = async () => {
  return (
    <Container
      title="Contacts"
      description={"Everything you need to know about your contacts"}
    >
      <div>
        <ContactView />
      </div>
    </Container>
  );
};

export default AccountsPage;
