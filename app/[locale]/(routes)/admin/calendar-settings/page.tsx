import { getCalendlySettings } from "@/lib/crm/calendar/calendly-settings";
import { CalendlyForm } from "./_components/CalendlyForm";

export default async function CalendarSettingsPage() {
  const settings = await getCalendlySettings();

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Calendar settings</h1>
        <p className="text-sm text-muted-foreground">
          Calendly organization webhook for booked-call capture.
        </p>
      </div>
      <CalendlyForm
        hasToken={Boolean(settings.apiToken)}
        hasSigningKey={Boolean(settings.signingKey)}
        webhookUri={settings.webhookUri}
      />
    </div>
  );
}
