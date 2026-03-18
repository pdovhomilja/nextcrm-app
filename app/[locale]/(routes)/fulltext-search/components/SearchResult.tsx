"use client";

import { useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import ResultPage from "../search/components/ResultPage";
import { fulltextSearch } from "@/actions/fulltext/search";

type Props = {};

const SearchResult = (props: Props) => {
  const searchParams = useSearchParams();

  const search = searchParams?.get("q");

  const [results, setResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!search) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    fulltextSearch(search)
      .then((res) => {
        if (res.error) {
          console.log(res.error);
          return;
        }
        setResults(res);
      })
      .catch((error) => {
        console.log(error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [search]);

  if (!search) return <div>Search for something</div>;

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Search query: {search}</h1>
      <ResultPage search={search} results={results} />
    </div>
  );
};

export default SearchResult;
