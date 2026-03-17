import Container from "@/app/[locale]/(routes)/components/ui/Container";
import { BasicView } from "./components/BasicView";
import { getTargetList } from "@/actions/crm/get-target-list";

const TargetListViewPage = async (props: any) => {
  const params = await props.params;
  const { targetListId } = params;
  const targetList: any = await getTargetList(targetListId);

  if (!targetList) return <div>Target list not found</div>;

  return (
    <Container
      title={`Target List: ${targetList?.name}`}
      description="View and manage targets in this list"
    >
      <div className="space-y-5">
        <BasicView data={targetList} />
      </div>
    </Container>
  );
};

export default TargetListViewPage;
