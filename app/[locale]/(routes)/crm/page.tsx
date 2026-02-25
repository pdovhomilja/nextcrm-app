import { Suspense } from "react";
import Container from "../components/ui/Container";
import MainPageView from "./components/MainPageView";
import SuspenseLoading from "@/components/loadings/suspense";
import { getTranslations } from "next-intl/server";

const CrmPage = async () => {
  const t = await getTranslations("CrmPage");
  return (
    <Container
      title={t("title")}
      description={t("description")}
    >
      {/*
      TODO: Think about how to handle the loading of the data to make better UX with suspense
      */}
      <Suspense fallback={<SuspenseLoading />}>
        <MainPageView />
      </Suspense>
    </Container>
  );
};

export default CrmPage;
