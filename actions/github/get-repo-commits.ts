import build from "@/buildCount.json";

export default async function getAllCommits(): Promise<number> {
  return build.build;
}
