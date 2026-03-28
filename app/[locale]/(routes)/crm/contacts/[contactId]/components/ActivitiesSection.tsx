import { getActivitiesByEntity } from "@/actions/crm/activities/get-activities-by-entity";
import { ActivitiesView } from "@/components/crm/activities/ActivitiesView";

interface Props {
  contactId: string;
}

export async function ActivitiesSection({ contactId }: Props) {
  const initialData = await getActivitiesByEntity("contact", contactId);
  return (
    <ActivitiesView entityType="contact" entityId={contactId} initialData={initialData} />
  );
}
