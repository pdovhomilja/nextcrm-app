import { getDocuments } from "@/actions/documents/get-documents";
import Container from "../components/ui/Container";
import { DocumentsDataTable } from "./components/data-table";
import { columns } from "./components/columns";
import FileUploader from "@/components/ui/file-uploader";
import { FileUploaderDropzone } from "@/components/ui/file-uploader-dropzone";
import ModalDropzone from "./components/modal-dropzone";

export const revalidate = 1;

const DocumentsPage = async () => {
  const documents: any = await getDocuments();
  return (
    <Container
      title="Documents"
      description={"Everything you need to know about company documents"}
    >
      <div className="py-5">
        <ModalDropzone />
      </div>

      <DocumentsDataTable data={documents} columns={columns} />
    </Container>
  );
};

export default DocumentsPage;
