export const SDK_VERSION = "0.2.1";

const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;

export function parseVersion(version: string): [number, number, number] {
  const m = SEMVER.exec(version);
  if (!m) throw new Error(`Invalid version: ${version}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

export function compareVersions(a: string, b: string): -1 | 0 | 1 {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  for (let i = 0; i < 3; i++) {
    if (pa[i] > pb[i]) return 1;
    if (pa[i] < pb[i]) return -1;
  }
  return 0;
}

export function satisfiesSdkRange(range: string, version: string = SDK_VERSION): boolean {
  if (!range.startsWith("^")) return false;
  const [rMaj, rMin, rPatch] = parseVersion(range.slice(1));
  const [vMaj, vMin, vPatch] = parseVersion(version);
  if (compareVersions(version, range.slice(1)) < 0) return false;
  if (rMaj > 0) return vMaj === rMaj;
  if (rMin > 0) return vMaj === 0 && vMin === rMin;
  return vMaj === 0 && vMin === 0 && vPatch === rPatch;
}
