import { redirect } from "next/navigation";

const FullTextSearchPage = async (props: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ q?: string }>;
}) => {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const q = searchParams?.q;
  redirect(`/${params.locale}/fulltext-search${q ? `?q=${encodeURIComponent(q)}` : ""}`);
};

export default FullTextSearchPage;
