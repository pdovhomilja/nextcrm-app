"use client";

import axios from "axios";
import { useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import ResultPage from "../search/components/ResultPage";

type Props = {};

const SearchResult = (props: Props) => {
  const searchParams = useSearchParams();

  const search = searchParams?.get("q");

  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    try {
      axios.post(`/api/fulltext-search`, { data: search }).then((res) => {
        setResults(res.data);
      });
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoading(false);
    }
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
