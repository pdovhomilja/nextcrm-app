import ResultPage from "./components/ResultPage";

import { getSearch } from "@/actions/fulltext/get-search-results";
import Container from "../../components/ui/Container";

const FullTextSearchPage = async (
  props: {
    params: Promise<{ search: string }>;
  }
) => {
  const params = await props.params;
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
