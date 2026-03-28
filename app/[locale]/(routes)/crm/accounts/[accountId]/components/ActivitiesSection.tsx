import { getActivitiesByEntity } from "@/actions/crm/activities/get-activities-by-entity";
import { ActivitiesView } from "@/components/crm/activities/ActivitiesView";

interface Props {
  accountId: string;
}

export async function ActivitiesSection({ accountId }: Props) {
  const initialData = await getActivitiesByEntity("account", accountId);
  return (
    <ActivitiesView entityType="account" entityId={accountId} initialData={initialData} />
  );
}
