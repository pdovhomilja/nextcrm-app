import Container from "@/app/[locale]/(routes)/components/ui/Container";
import { listPrompts } from "@/actions/crm/prompts/list-prompts";
import { PromptList } from "./_components/PromptList";

const PromptsPage = async () => {
  const [email, homepage] = await Promise.all([
    listPrompts({ kind: "EMAIL" }),
    listPrompts({ kind: "HOMEPAGE" }),
  ]);
  const prompts = [...email, ...homepage].map((p) => ({
    id: p.id,
    name: p.name,
    body: p.body,
    kind: p.kind,
    scope: p.scope,
  }));
  return (
    <Container
      title="AI Prompt Library"
      description="Reusable prompts for email and homepage generation"
    >
      <PromptList prompts={prompts} />
    </Container>
  );
};
export default PromptsPage;
