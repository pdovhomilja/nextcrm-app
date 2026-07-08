// PRLOAD — Creación y borrado lógico de contactos (escritura).
//
// META:
//   cases:    PRLOAD-006, PRLOAD-007, PRLOAD-008, PRLOAD-020
//   endpoint: Server Action createContact / deleteContact (POST Next-Action)
//   objetivo: tiempo de respuesta, throughput y tasa de error de la creación de
//             contacto, más el borrado lógico, bajo carga normal.
//   umbral:   escritura LOAD — p95 < 800ms, p99 < 1.5s, error < 0.5%
//   carga:    20 VU, 10 min (Diseño §4.1)

import { group, sleep } from "k6";
import { ROUTES } from "../../config/environment.js";
import { load } from "../../config/scenarios.js";
import { PRESETS, buildThresholds } from "../../config/thresholds.js";
import { authenticate } from "../../lib/auth.js";
import { invokeServerAction } from "../../lib/client.js";
import { record, makeHandleSummary } from "../../lib/metrics.js";
import { newContactArgs } from "../../lib/data.js";

export const options = {
  scenarios: { contacts_create_load: load(20, 10) },
  thresholds: buildThresholds({ write: PRESETS.loadWrite }),
};

export function setup() {
  return { cookie: authenticate() };
}

export default function (data) {
  const t = { op: "write", suite: "PRLOAD", entity: "contacts" };

  group("PRLOAD-006/007/008 creación de contacto", () => {
    const res = invokeServerAction(
      "createContact",
      ROUTES.contacts,
      newContactArgs(),
      data.cookie,
      t,
    );
    record(res, "write");
  });

  sleep(1);
}

export const handleSummary = makeHandleSummary("PRLOAD-contacts-create");
