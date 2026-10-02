import Container from "@/app/[locale]/(routes)/components/ui/Container";
import { listPrompts } from "@/actions/crm/prompts/list-prompts";
import { requireAuthenticated, isAdmin } from "@/lib/authz";
import { PromptList } from "./_components/PromptList";

const PromptsPage = async () => {
  const [email, homepage, homepageBase, industry, style, avoid] = await Promise.all([
    listPrompts({ kind: "EMAIL" }),
    listPrompts({ kind: "HOMEPAGE" }),
    listPrompts({ kind: "HOMEPAGE_BASE" }),
    listPrompts({ kind: "HOMEPAGE_INDUSTRY" }),
    listPrompts({ kind: "HOMEPAGE_STYLE" }),
    listPrompts({ kind: "HOMEPAGE_AVOID" }),
  ]);
  // UX only: the server actions enforce the admin gate for HOMEPAGE_BASE and the
  // industry / style / avoid layer kinds.
  const admin = await requireAuthenticated().then(isAdmin, () => false);
  const prompts = [...homepageBase, ...industry, ...style, ...avoid, ...email, ...homepage].map((p) => ({
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
