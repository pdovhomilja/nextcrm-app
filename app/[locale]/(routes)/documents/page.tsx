import Container from "@/app/[locale]/(routes)/components/ui/Container";
import { getDocumentsPageData } from "@/actions/documents/get-documents-page-data";
import { DocumentsDataTable } from "./components/data-table";
import { columns } from "./components/columns";
import { BulkUploadModal } from "./components/bulk-upload-modal";
import { getTranslations } from "next-intl/server";

const DocumentsPage = async () => {
  const { documents, accountOptions } = await getDocumentsPageData();
  const t = await getTranslations("DocumentsPage");

  return (
    <Container title={t("title")} description={t("description")}>
      <div className="flex justify-end py-5">
        <BulkUploadModal />
      </div>
      <DocumentsDataTable data={documents} columns={columns} accounts={accountOptions} />
    </Container>
  );
};

export default DocumentsPage;
