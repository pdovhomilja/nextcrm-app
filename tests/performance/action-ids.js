// Mapa estático nombreServerAction -> hash del header `Next-Action`.
//
// Diseño de Casos de Prueba de Rendimiento §4.5 — "Estrategia de invocación de
// Server Actions desde k6".
//
// Las Server Actions de Next.js no exponen una URL por operación: todas se
// invocan con POST a la URL de la página que las contiene y se distinguen por
// el header `Next-Action`, cuyo valor es un hash cifrado. Por defecto Next
// recalcula ese hash en cada build, así que para las pruebas de rendimiento se
// fija la clave de cifrado con la variable de entorno
// `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` en el build de staging. Con la clave
// fija, el hash es estable entre builds mientras no cambie el código de la
// acción.
//
// PROCEDIMIENTO PARA CAPTURAR/ACTUALIZAR LOS IDs (§4.5):
//   1. openssl rand -base64 32  -> NEXT_SERVER_ACTIONS_ENCRYPTION_KEY (una vez).
//   2. Compilar el build de staging con esa clave fija.
//   3. Ejecutar manualmente cada operación crítica y copiar el valor del header
//      `Next-Action` desde la pestaña de red del navegador.
//   4. Pegar el hash en la clave correspondiente de este mapa y versionarlo.
//
// RIESGO R-10: si se modifica el código de una Server Action, su hash cambia
// aunque la clave de cifrado sea fija. Recapturar el ID afectado antes de
// reanudar la suite.
//
// Los IDs marcados como "REEMPLAZAR" son placeholders: deben sustituirse por
// los hashes reales capturados en el entorno de staging antes de ejecutar las
// pruebas de escritura. Se pueden pasar por -e para no versionar hashes de un
// entorno concreto, p.ej. `-e AID_createContact=00bd59...`.

function fromEnv(name, fallback) {
  return __ENV[`AID_${name}`] || fallback;
}

export const ACTION_IDS = {
  // Escrituras (POST con header Next-Action).
  createAccount: fromEnv("createAccount", "REEMPLAZAR_createAccount"),
  updateAccount: fromEnv("updateAccount", "REEMPLAZAR_updateAccount"),
  deleteAccount: fromEnv("deleteAccount", "REEMPLAZAR_deleteAccount"),
  createContact: fromEnv("createContact", "REEMPLAZAR_createContact"),
  updateContact: fromEnv("updateContact", "REEMPLAZAR_updateContact"),
  deleteContact: fromEnv("deleteContact", "REEMPLAZAR_deleteContact"),
  convertTarget: fromEnv("convertTarget", "REEMPLAZAR_convertTarget"),
  createOpportunity: fromEnv("createOpportunity", "REEMPLAZAR_createOpportunity"),
  updateOpportunity: fromEnv("updateOpportunity", "REEMPLAZAR_updateOpportunity"),
  createActivity: fromEnv("createActivity", "REEMPLAZAR_createActivity"),
  addContractLineItem: fromEnv("addContractLineItem", "REEMPLAZAR_addContractLineItem"),
};

// Devuelve el hash de una acción y avisa si sigue siendo un placeholder.
export function actionId(name) {
  const id = ACTION_IDS[name];
  if (!id || id.startsWith("REEMPLAZAR_")) {
    console.warn(
      `[action-ids] "${name}" no tiene un Next-Action ID real. ` +
        `Captúralo en staging (Diseño §4.5) o pásalo con -e AID_${name}=<hash>.`,
    );
  }
  return id;
}
