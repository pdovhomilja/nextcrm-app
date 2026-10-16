import { cn } from "@/lib/utils";

type DbStatus = "unknown" | "connected" | "failed";

type Props = {
  databaseStatus: DbStatus;
  adminProvisioningStatus?: string | null;
  className?: string;
};

export function VentureConnectionIndicator({
  databaseStatus,
  adminProvisioningStatus,
  className,
}: Props) {
  const adminOk =
    adminProvisioningStatus === "succeeded" || adminProvisioningStatus === "already_exists";

  return (
    <div className={cn("flex flex-wrap items-center gap-4 text-sm", className)}>
      <span className="inline-flex items-center gap-2">
        <span
          className={cn(
            "h-2.5 w-2.5 rounded-full",
            databaseStatus === "connected" && "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]",
            databaseStatus === "failed" && "bg-red-500",
            databaseStatus === "unknown" && "bg-muted-foreground/40",
          )}
          aria-hidden
        />
        Database {databaseStatus === "connected" ? "connected" : databaseStatus === "failed" ? "failed" : "not tested"}
      </span>
      <span className="inline-flex items-center gap-2">
        <span
          className={cn(
            "h-2.5 w-2.5 rounded-full",
            adminOk && "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]",
            adminProvisioningStatus === "failed" && "bg-red-500",
            !adminOk && adminProvisioningStatus !== "failed" && "bg-muted-foreground/40",
          )}
          aria-hidden
        />
        Admin portal {adminOk ? "seeded" : adminProvisioningStatus === "failed" ? "seed failed" : "not seeded"}
      </span>
    </div>
  );
}
