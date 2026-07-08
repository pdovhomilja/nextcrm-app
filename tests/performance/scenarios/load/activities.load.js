// PRLOAD — Actividades: creación con vínculos (escritura) y listado por entidad.
//
// META:
//   cases:    PRLOAD-013, PRLOAD-014
//   endpoint: Server Action createActivity + getActivitiesByEntity
//   objetivo: tiempo de respuesta de la creación de actividad con vínculos
//             múltiples (varias inserciones) y del listado de actividades por
//             entidad bajo carga normal.
//   umbral:   escritura LOAD p95 < 800ms; lectura LOAD p95 < 500ms
//   carga:    30 VU, 10 min
//   requiere: pool de accounts en data/entity-ids.json (clave "accounts").

import { group, sleep } from "k6";
import { ROUTES } from "../../config/environment.js";
import { load } from "../../config/scenarios.js";
import { PRESETS, buildThresholds } from "../../config/thresholds.js";
import { authenticate } from "../../lib/auth.js";
import { readPage, invokeServerAction } from "../../lib/client.js";
import { record, makeHandleSummary } from "../../lib/metrics.js";
import { idPool, pick, newActivityArgs } from "../../lib/data.js";

const accounts = idPool("accounts");

export const options = {
  scenarios: { activities_load: load(30, 10) },
  thresholds: buildThresholds({ read: PRESETS.loadRead, write: PRESETS.loadWrite }),
};

export function setup() {
  return { cookie: authenticate() };
}

export default function (data) {
  const read = { op: "read", suite: "PRLOAD", entity: "activities" };
  const write = { op: "write", suite: "PRLOAD", entity: "activities" };
  const accountId = pick(accounts);
  const links = accountId ? [{ entityType: "account", entityId: accountId }] : [];

  group("PRLOAD-013 creación de actividad con vínculos", () => {
    const res = invokeServerAction(
      "createActivity",
      ROUTES.accounts,
      newActivityArgs(links),
      data.cookie,
      write,
    );
    record(res, "write");
  });

  if (accountId) {
    group("PRLOAD-014 listado de actividades por entidad", () => {
      record(readPage(ROUTES.accounts, data.cookie, read, `/${accountId}`), "read");
    });
  }

  sleep(1);
}

export const handleSummary = makeHandleSummary("PRLOAD-activities");
