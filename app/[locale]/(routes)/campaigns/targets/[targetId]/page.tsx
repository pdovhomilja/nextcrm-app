import Container from "@/app/[locale]/(routes)/components/ui/Container";
import { BasicView } from "./components/BasicView";
import { getTarget } from "@/actions/crm/get-target";
import { resolveTargetTitle } from "@/lib/crm/target-type";

const TargetViewPage = async (props: any) => {
  const params = await props.params;
  const { targetId } = params;
  const target: any = await getTarget(targetId);

  if (!target) return <div>Target not found</div>;

  return (
    <Container
      title={`Target detail view: ${resolveTargetTitle(target)}`}
      description="Everything you need to know about this target"
    >
      <div className="space-y-5">
        <BasicView data={target} />
      </div>
    </Container>
  );
};

export default TargetViewPage;
