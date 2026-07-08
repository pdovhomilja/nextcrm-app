// PRLOAD — Listado de contactos con filtros (lectura).
//
// META:
//   cases:    PRLOAD-004, PRLOAD-005
//   endpoint: GET /crm/contacts — getContactsByAccountId / getLeads / getOpportunity
//   objetivo: tiempo de respuesta y throughput del listado de contactos con
//             filtros y ordenación bajo carga normal.
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
  scenarios: { contacts_list_load: load(50, 10) },
  thresholds: buildThresholds({ read: PRESETS.loadRead }),
};

export function setup() {
  return { cookie: authenticate() };
}

export default function (data) {
  const t = { op: "read", suite: "PRLOAD", entity: "contacts" };

  group("PRLOAD-004 listado de contactos con filtros", () => {
    record(readPage(ROUTES.contacts, data.cookie, t, "?status=true&sort=last_name"), "read");
  });
  group("PRLOAD-005 throughput del listado de contactos", () => {
    record(readPage(ROUTES.contacts, data.cookie, t, "?page=2"), "read");
  });

  sleep(1);
}

export const handleSummary = makeHandleSummary("PRLOAD-contacts-list");
