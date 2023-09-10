import ResultPage from "./components/ResultPage";

import { getSearch } from "@/actions/fulltext/get-search-results";
import Container from "../../components/ui/Container";

const FullTextSearchPage = async ({
  params,
}: {
  params: { search: string };
}) => {
  const { search } = params;
  const results: any = await getSearch(search);

  return (
    <Container
      title={`Search: ${search} `}
      description={`Search results for ${search}`}
    >
      <ResultPage search={search} results={results} />
    </Container>
  );
};

export default FullTextSearchPage;
