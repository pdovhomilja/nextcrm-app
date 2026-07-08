// PRLOAD — Dashboard con resúmenes agregados (lectura compleja).
//
// META:
//   cases:    PRLOAD-012
//   endpoint: GET /crm/dashboard — resúmenes agregados
//   objetivo: tiempo de respuesta del dashboard, que agrega múltiples consultas.
//   umbral:   compleja LOAD — p95 < 1.5s, p99 < 2.5s, error < 0.5% (Diseño §4.3)
//   carga:    30 VU, 10 min (Plan §5.1 LOAD-04)

import { group, sleep } from "k6";
import { ROUTES } from "../../config/environment.js";
import { load } from "../../config/scenarios.js";
import { PRESETS, buildThresholds } from "../../config/thresholds.js";
import { authenticate } from "../../lib/auth.js";
import { readPage } from "../../lib/client.js";
import { record, makeHandleSummary } from "../../lib/metrics.js";

export const options = {
  scenarios: { dashboard_load: load(30, 10) },
  thresholds: buildThresholds({ complex: PRESETS.loadComplex }),
};

export function setup() {
  return { cookie: authenticate() };
}

export default function (data) {
  const t = { op: "complex", suite: "PRLOAD", entity: "dashboard" };

  group("PRLOAD-012 dashboard con resúmenes", () => {
    record(readPage(ROUTES.dashboard, data.cookie, t), "complex");
  });

  sleep(1);
}

export const handleSummary = makeHandleSummary("PRLOAD-dashboard");
