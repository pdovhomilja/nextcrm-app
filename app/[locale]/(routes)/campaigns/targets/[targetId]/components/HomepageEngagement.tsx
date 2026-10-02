import { LocalDateTime } from "./LocalDateTime";

/**
 * Email engagement for the sample homepage — shown under the "viewed N times" line
 * on the target detail. Reflects the most recent SENT outreach email that included
 * the homepage link: when it was opened, and when the homepage link specifically
 * was clicked (distinct from any-link `clicked_at`, which fires for unsubscribe
 * etc.). Fed by Resend open/click webhooks; absent until the email is opened/clicked.
 */
export function HomepageEngagement({
  openedAt,
  homepageClickedAt,
}: {
  openedAt: Date | null;
  homepageClickedAt: Date | null;
}) {
  return (
    <div className="text-sm text-muted-foreground" data-testid="homepage-engagement">
      <span className="font-medium text-foreground">Email</span> —{" "}
      {openedAt ? (
        <>
          opened <LocalDateTime iso={openedAt.toISOString()} />
        </>
      ) : (
        <span>not opened yet</span>
      )}
      {" · "}
      {homepageClickedAt ? (
        <>
          homepage link clicked{" "}
          <LocalDateTime iso={homepageClickedAt.toISOString()} />
        </>
      ) : (
        <span>homepage link not clicked yet</span>
      )}
    </div>
  );
}
