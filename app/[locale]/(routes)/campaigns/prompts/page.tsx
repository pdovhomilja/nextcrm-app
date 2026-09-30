import Container from "@/app/[locale]/(routes)/components/ui/Container";
import { listPrompts } from "@/actions/crm/prompts/list-prompts";
import { requireAuthenticated, isAdmin } from "@/lib/authz";
import { PromptList } from "./_components/PromptList";

const PromptsPage = async () => {
  const [email, homepage, homepageBase] = await Promise.all([
    listPrompts({ kind: "EMAIL" }),
    listPrompts({ kind: "HOMEPAGE" }),
    listPrompts({ kind: "HOMEPAGE_BASE" }),
  ]);
  // UX only: the server actions enforce the admin gate for HOMEPAGE_BASE.
  const admin = await requireAuthenticated().then(isAdmin, () => false);
  const prompts = [...homepageBase, ...email, ...homepage].map((p) => ({
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
      <PromptList prompts={prompts} isAdmin={admin} />
    </Container>
  );
};
export default PromptsPage;
