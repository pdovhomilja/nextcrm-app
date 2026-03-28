import { getActivitiesByEntity } from "@/actions/crm/activities/get-activities-by-entity";
import { ActivitiesView } from "@/components/crm/activities/ActivitiesView";

interface Props {
  contractId: string;
}

export async function ActivitiesSection({ contractId }: Props) {
  const initialData = await getActivitiesByEntity("contract", contractId);
  return (
    <ActivitiesView entityType="contract" entityId={contractId} initialData={initialData} />
  );
}
