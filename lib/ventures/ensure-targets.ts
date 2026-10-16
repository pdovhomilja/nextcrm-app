import { prismadb } from "@/lib/prisma";
import { defaultAdminUrl, defaultErpUrl } from "@/lib/ventures/subdomain";

const TARGET_SPECS = [
  {
    targetKey: "erp",
    displayName: "ERP",
    applicationType: "erp",
    defaultUrl: defaultErpUrl,
  },
  {
    targetKey: "admin",
    displayName: "Admin Portal",
    applicationType: "admin_portal",
    defaultUrl: defaultAdminUrl,
  },
] as const;

/** Default ERP + Admin targets for a venture key (does not deploy anything). */
export async function ensureDefaultTargetsForVenture(ventureId: string, key: string) {
  for (const spec of TARGET_SPECS) {
    await prismadb.ventureApplicationTarget.upsert({
      where: {
        ventureId_targetKey: { ventureId, targetKey: spec.targetKey },
      },
      create: {
        ventureId,
        targetKey: spec.targetKey,
        displayName: `${key.toUpperCase()} ${spec.displayName}`,
        applicationType: spec.applicationType,
        deploymentUrl: spec.defaultUrl(key),
      },
      update: {},
    });
  }
}
