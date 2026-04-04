import Container from "@/app/[locale]/(routes)/components/ui/Container";
import { getDocuments } from "@/actions/documents/get-documents";
import { getAccounts } from "@/actions/crm/get-accounts";
import { DocumentsDataTable } from "./components/data-table";
import { columns } from "./components/columns";
import { BulkUploadModal } from "./components/bulk-upload-modal";
import { getTranslations } from "next-intl/server";

const DocumentsPage = async () => {
  const documents = await getDocuments();
  const t = await getTranslations("DocumentsPage");
  const allAccounts = await getAccounts();
  const accountOptions = (allAccounts ?? []).map((a: any) => ({
    id: a.id,
    name: a.name,
  }));

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
