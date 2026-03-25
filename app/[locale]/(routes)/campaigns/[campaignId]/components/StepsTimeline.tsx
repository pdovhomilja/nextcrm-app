type Step = {
  id: string;
  order: number;
  subject: string;
  send_to: string;
  scheduled_at: Date | null;
  sent_at: Date | null;
  delay_days: number;
  template: { name: string } | null;
  sends: Array<{ status: string; opened_at: Date | null }>;
};

export default function StepsTimeline({ steps }: { steps: Step[] }) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Campaign Steps</h2>
      {steps.map((step, i) => {
        const sent = step.sends.filter((s) =>
          ["sent", "delivered"].includes(s.status)
        ).length;
        const opened = step.sends.filter((s) => s.opened_at != null).length;
        const openRate = sent > 0 ? Math.round((opened / sent) * 100) : 0;

        return (
          <div
            key={step.id}
            className="flex items-center gap-4 p-4 border rounded-lg bg-background"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-medium flex-shrink-0">
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">
                {i === 0 ? "Initial Send" : `Follow-up ${i}`} — {step.subject}
              </div>
              <div className="text-xs text-muted-foreground">
                Template: {step.template?.name ?? "—"} &middot;{" "}
                {step.delay_days > 0 ? `+${step.delay_days} days` : "initial"} &middot;{" "}
                {step.send_to === "non_openers" ? "Non-openers only" : "All recipients"}
              </div>
            </div>
            <div className="text-right text-xs text-muted-foreground flex-shrink-0">
              {step.sent_at ? (
                <div className="text-green-600">
                  Sent {new Date(step.sent_at).toLocaleDateString()}
                </div>
              ) : step.scheduled_at ? (
                <div className="text-blue-600">
                  Scheduled {new Date(step.scheduled_at).toLocaleDateString()}
                </div>
              ) : (
                <div>Pending</div>
              )}
              {sent > 0 && (
                <div>
                  {sent} sent &middot; {openRate}% opens
                </div>
              )}
            </div>
          </div>
        );
      })}
      {steps.length === 0 && (
        <p className="text-sm text-muted-foreground">No steps configured.</p>
      )}
    </div>
  );
}
