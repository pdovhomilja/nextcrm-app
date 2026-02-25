import { getDocuments } from "@/actions/documents/get-documents";
import Container from "../components/ui/Container";
import { DocumentsDataTable } from "./components/data-table";
import { columns } from "./components/columns";
import FileUploader from "@/components/ui/file-uploader";
import { FileUploaderDropzone } from "@/components/ui/file-uploader-dropzone";
import ModalDropzone from "./components/modal-dropzone";
import { Documents } from "@prisma/client";
import { getTranslations } from "next-intl/server";

const DocumentsPage = async () => {
  const documents: Documents[] = await getDocuments();
  const t = await getTranslations("DocumentsPage");

  if (!documents) {
    return <div>Something went wrong</div>;
  }

  return (
    <Container
      title={t("title")}
      description={t("description")}
    >
      <div className="flex space-x-5 py-5">
        <ModalDropzone buttonLabel={t("uploadPdf")} fileType="pdfUploader" />
        <ModalDropzone buttonLabel={t("uploadImages")} fileType="imageUploader" />
        <ModalDropzone
          buttonLabel={t("uploadOther")}
          fileType="docUploader"
        />
      </div>

      <DocumentsDataTable data={documents} columns={columns} />
    </Container>
  );
};

export default DocumentsPage;
