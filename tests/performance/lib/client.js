// Cliente HTTP compartido: invocación de Server Actions y lectura de páginas.
// Diseño §4.5.

import http from "k6/http";
import { check } from "k6";
import { BASE_URL, localized } from "../config/environment.js";
import { actionId } from "../action-ids.js";

// Invoca una Server Action de escritura.
//
//   invokeServerAction("createContact", ROUTES.contacts, [{ last_name: "X" }], cookie, { op: "write" })
//
// - actionName: clave en action-ids.js.
// - pagePath: ruta (sin locale) de la página que contiene la acción; la acción
//   se postea contra esa URL prefijada con el locale.
// - args: array con los argumentos posicionales de la acción (se serializa como
//   JSON, igual que en el ejemplo del Diseño §4.5).
export function invokeServerAction(actionName, pagePath, args, cookie, tags = {}) {
  const res = http.post(`${BASE_URL}${localized(pagePath)}`, JSON.stringify(args), {
    headers: {
      "Content-Type": "text/plain;charset=UTF-8",
      Accept: "text/x-component",
      "Next-Action": actionId(actionName),
      Cookie: cookie,
    },
    tags: { action: actionName, ...tags },
  });
  check(res, {
    [`${actionName}: status 2xx/3xx`]: (r) => r.status >= 200 && r.status < 400,
    [`${actionName}: sin error de servidor`]: (r) => r.status < 500,
  });
  return res;
}

// Lee una página (Server Component vía GET). Diseño §4.5: las lecturas se
// resuelven con un GET normal, sin el header Next-Action.
//
//   readPage(ROUTES.accounts, cookie, { op: "read" }, "?page=2&sort=name")
export function readPage(pagePath, cookie, tags = {}, query = "") {
  const res = http.get(`${BASE_URL}${localized(pagePath)}${query}`, {
    headers: { Cookie: cookie, Accept: "text/html" },
    tags: { ...tags },
  });
  check(res, {
    [`GET ${pagePath}: status 200`]: (r) => r.status === 200,
    [`GET ${pagePath}: sin error de servidor`]: (r) => r.status < 500,
  });
  return res;
}
