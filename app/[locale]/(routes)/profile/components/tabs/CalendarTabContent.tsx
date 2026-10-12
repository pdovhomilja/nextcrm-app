import { CalendarConnectionsList } from "../CalendarConnectionsList";

export function CalendarTabContent() {
  return (
    <div className="space-y-4">
      <p className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        Use the same Google account you use in the <strong className="text-foreground">Google Calendar app on your phone</strong>.
        After you connect, VenSai meetings appear in that calendar and sync to your mobile automatically via Google.
        Choose <strong className="text-foreground">Enable two-way sync</strong> so CRM can also create and update events on Google
        (not read-only).
      </p>
      <CalendarConnectionsList />
    </div>
  );
}
