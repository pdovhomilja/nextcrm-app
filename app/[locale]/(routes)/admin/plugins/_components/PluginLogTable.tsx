import { prismaBase } from "@/lib/prisma-base";

export async function PluginLogTable({ pluginId }: { pluginId: string }) {
  const rows = await prismaBase.pluginLog.findMany({ where: { pluginId }, orderBy: { createdAt: "desc" }, take: 200 });
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b align-top">
              <td className="py-1 pr-3 whitespace-nowrap tabular-nums">{r.createdAt.toISOString().replace("T", " ").slice(0, 19)}</td>
              <td className="py-1 pr-3 uppercase">{r.level}</td>
              <td className="py-1 break-all">{r.message}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
