import React, { Suspense } from "react";

import SearchResult from "./components/SearchResult";
import SuspenseLoading from "@/components/loadings/suspense";

const FulltextPage = () => {
  return (
    <Suspense fallback={<SuspenseLoading />}>
      <SearchResult />
    </Suspense>
  );
};

export default FulltextPage;
