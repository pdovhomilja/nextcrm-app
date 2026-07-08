// PRLOAD — Búsqueda de leads por nombre y email (lectura).
//
// META:
//   cases:    PRLOAD-015, PRLOAD-016
//   endpoint: GET /crm/leads con query de búsqueda — getLeads
//   objetivo: tiempo de respuesta de la búsqueda de leads por nombre y por email.
//   umbral:   lectura LOAD — p95 < 500ms, p99 < 1s, error < 0.5%
//   carga:    50 VU, 10 min

import { group, sleep } from "k6";
import { ROUTES } from "../../config/environment.js";
import { load } from "../../config/scenarios.js";
import { PRESETS, buildThresholds } from "../../config/thresholds.js";
import { authenticate } from "../../lib/auth.js";
import { readPage } from "../../lib/client.js";
import { record, makeHandleSummary } from "../../lib/metrics.js";

export const options = {
  scenarios: { leads_search_load: load(50, 10) },
  thresholds: buildThresholds({ read: PRESETS.loadRead }),
};

export function setup() {
  return { cookie: authenticate() };
}

export default function (data) {
  const t = { op: "read", suite: "PRLOAD", entity: "leads" };

  group("PRLOAD-015 búsqueda por nombre", () => {
    record(readPage(ROUTES.leads, data.cookie, t, "?q=Perf&field=name"), "read");
  });
  group("PRLOAD-016 búsqueda por email", () => {
    record(readPage(ROUTES.leads, data.cookie, t, "?q=perf.test&field=email"), "read");
  });

  sleep(1);
}

export const handleSummary = makeHandleSummary("PRLOAD-leads-search");
