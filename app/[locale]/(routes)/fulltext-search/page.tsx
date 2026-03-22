import React, { Suspense } from "react";

import SearchResult from "./components/SearchResult";
import SearchSkeleton from "@/components/skeletons/search-skeleton";

const FulltextPage = () => {
  return (
    <Suspense fallback={<SearchSkeleton />}>
      <SearchResult />
    </Suspense>
  );
};

export default FulltextPage;
