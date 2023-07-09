import { getDocuments } from "@/actions/documents/get-documents";
import Container from "../components/ui/Container";
import { DocumentsDataTable } from "./components/data-table";
import { columns } from "./components/columns";

const DocumentsPage = async () => {
  const documents: any = await getDocuments();
  return (
    <Container
      title="Documents"
      description={"Everything you need to know about company documents"}
    >
      {/*       <div>
        <pre>
          <code>{JSON.stringify(documents[0], null, 2)}</code>
        </pre>
      </div> */}
      <DocumentsDataTable data={documents} columns={columns} />
    </Container>
  );
};

export default DocumentsPage;
