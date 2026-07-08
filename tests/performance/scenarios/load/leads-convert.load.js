// PRLOAD — Conversión de lead/target (escritura compleja).
//
// META:
//   cases:    PRLOAD-009, PRLOAD-010
//   endpoint: Server Action convertTarget (POST Next-Action)
//   objetivo: tiempo de respuesta y throughput de la conversión de lead, que
//             ejecuta múltiples operaciones en transacción (cuenta + contacto).
//   umbral:   compleja LOAD — p95 < 1.5s, p99 < 2.5s, error < 0.5%
//   carga:    10 VU, 10 min (Diseño §4.1)
//   requiere: pool de targets sin convertir en data/entity-ids.json (clave "targets").

import { group, sleep } from "k6";
import { ROUTES } from "../../config/environment.js";
import { load } from "../../config/scenarios.js";
import { PRESETS, buildThresholds } from "../../config/thresholds.js";
import { authenticate } from "../../lib/auth.js";
import { invokeServerAction } from "../../lib/client.js";
import { record, makeHandleSummary } from "../../lib/metrics.js";
import { idPool, pick, convertTargetArgs } from "../../lib/data.js";

const targets = idPool("targets");

export const options = {
  scenarios: { leads_convert_load: load(10, 10) },
  thresholds: buildThresholds({ complex: PRESETS.loadComplex }),
};

export function setup() {
  return { cookie: authenticate() };
}

export default function (data) {
  const t = { op: "complex", suite: "PRLOAD", entity: "leads" };
  const targetId = pick(targets);
  if (!targetId) {
    // Sin pool sembrado no hay nada que convertir; se registra y se sale.
    sleep(1);
    return;
  }

  group("PRLOAD-009/010 conversión de lead", () => {
    const res = invokeServerAction(
      "convertTarget",
      ROUTES.leads,
      convertTargetArgs(targetId),
      data.cookie,
      t,
    );
    record(res, "complex");
  });

  sleep(1);
}

export const handleSummary = makeHandleSummary("PRLOAD-leads-convert");
