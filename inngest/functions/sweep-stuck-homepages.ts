import { inngest } from "@/inngest/client";
import { prismadb } from "@/lib/prisma";

/**
 * A homepage generation is considered dead once it has sat PENDING/RUNNING for
 * longer than this. It must comfortably exceed the worst-case HEALTHY runtime
 * (initial + 3 auto passes, each a render + vision render + vision model call,
 * plus Inngest's function-level retries with backoff). A successful but slow
 * run was ~11 min in prod; 30 min clears that with margin.
 */
export const STUCK_AFTER_MS = 30 * 60 * 1000;

const STUCK_ERROR =
  "Generation stalled with no progress for 30m and was marked failed by the sweep. Re-run to try again.";

/**
 * SDK-independent backstop for the "never stuck RUNNING" invariant.
 *
 * generate-homepage records FAILED in-body on its final retry attempt, but a
 * HARD platform kill (the 300s maxDuration, or an OOM) can terminate the
 * function mid-step and skip the body's catch entirely, leaving the row stuck
 * PENDING/RUNNING. Inngest v4's `onFailure` can't cover this for us — it rejects
 * the internal `inngest/function.failed` event for a function that declares
 * `triggers` (see generate-homepage.ts) — so we sweep on a cron instead.
 *
 * `updatedAt` only advances on a homepage-ROW write (mark-running at the start,
 * mark-ready at the end); the per-pass work writes separate version rows, so a
 * stalled run's `updatedAt` stays pinned near its start. We only ever flip rows
 * older than STUCK_AFTER_MS, so an in-flight (or briefly queued) run is never
 * clobbered. updateMany on a small, status+deletedAt-indexed table is cheap.
 */
export const sweepStuckHomepages = inngest.createFunction(
  {
    id: "homepage-sweep-stuck",
    name: "Homepage: fail stalled generations",
    triggers: [{ cron: "*/10 * * * *" }],
  },
  async ({ step }) => {
    const cutoff = new Date(Date.now() - STUCK_AFTER_MS);
    const result = await step.run("fail-stalled", () =>
      prismadb.crm_Target_Homepage.updateMany({
        where: {
          deletedAt: null,
          status: { in: ["PENDING", "RUNNING"] },
          updatedAt: { lt: cutoff },
        },
        data: { status: "FAILED", error: STUCK_ERROR },
      }),
    );
    if (result.count > 0) {
      console.warn("[HOMEPAGE_SWEEP] failed stalled generations", { count: result.count });
    }
    return { failed: result.count };
  },
);
