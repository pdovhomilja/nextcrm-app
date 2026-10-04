import { prismaBase } from "@/lib/prisma-base";
import { withPluginRules } from "@/lib/plugins/prisma-extension";

export const prismadb = withPluginRules(prismaBase);
export type DbClient = typeof prismadb;
