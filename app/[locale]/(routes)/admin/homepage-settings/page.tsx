import { getHomepageSettingsForAdmin } from "@/actions/admin/homepage-settings";
import { HOMEPAGE_MODELS } from "@/lib/homepage/settings";
import { HomepageSettingsForm } from "./_components/HomepageSettingsForm";

export default async function HomepageSettingsPage() {
  const res = await getHomepageSettingsForAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Homepage Generation
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Choose the model, output token budget and base prompt used when
          generating target homepages.
        </p>
      </div>
      {"error" in res ? (
        <p className="text-sm text-destructive">{res.error}</p>
      ) : (
        <HomepageSettingsForm initial={res.data} models={HOMEPAGE_MODELS} />
      )}
    </div>
  );
}
