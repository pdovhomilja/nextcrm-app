import { getActivitiesByEntity } from "@/actions/crm/activities/get-activities-by-entity";
import { ActivitiesView } from "@/components/crm/activities/ActivitiesView";

interface Props {
  opportunityId: string;
}

export async function ActivitiesSection({ opportunityId }: Props) {
  const initialData = await getActivitiesByEntity("opportunity", opportunityId);
  return (
    <ActivitiesView entityType="opportunity" entityId={opportunityId} initialData={initialData} />
  );
}
