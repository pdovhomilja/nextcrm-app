import { LocalDateTime } from "./LocalDateTime";

/**
 * Compact "did they look at their sample?" line for the target detail. Counts are
 * UA-filtered and approximate (see lib/homepage/views.ts) — a signal, not exact
 * analytics.
 */
export function HomepageViews({
  count,
  lastViewedAt,
}: {
  count: number;
  lastViewedAt: Date | null;
}) {
  return (
    <div className="text-sm text-muted-foreground" data-testid="homepage-views">
      <span className="font-medium text-foreground">Sample homepage</span> —{" "}
      {count === 0 ? (
        "not viewed yet"
      ) : (
        <>
          viewed {count} {count === 1 ? "time" : "times"}
          {lastViewedAt ? (
            <>
              {" · last "}
              <LocalDateTime iso={lastViewedAt.toISOString()} />
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
