import { DataTable } from "@/components/ui/data-table";
import Container from "../components/ui/Container";
import { getNotions } from "@/actions/get-notions";
import { columns } from "./components/Columns";

type Props = {};

const SecondBrainPage = async (props: Props) => {
  const notions: any = await getNotions();
  return (
    <Container
      title="Second Brain"
      description={"Everything you need to know about Your notions"}
    >
      <DataTable columns={columns} data={notions} />
    </Container>
  );
};

export default SecondBrainPage;
