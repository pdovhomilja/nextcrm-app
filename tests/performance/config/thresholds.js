// Umbrales de aceptación (Diseño de Casos de Prueba de Rendimiento §4.3).
//
// Cada preset define p95, p99 (ms) y tasa de error máxima. Los escenarios
// etiquetan cada request con un tag `op` (read | write | complex) y estos
// presets se traducen en thresholds de k6 sobre las submétricas
// `http_req_duration{op:...}` y `http_req_failed{op:...}`.

export const PRESETS = {
  // LOAD (§4.3)
  loadRead: { p95: 500, p99: 1000, err: 0.005 },
  loadWrite: { p95: 800, p99: 1500, err: 0.005 },
  loadComplex: { p95: 1500, p99: 2500, err: 0.005 },
  // STRESS (§4.3)
  stressRead: { p95: 2000, p99: 3000, err: 0.02 },
  stressWrite: { p95: 2500, p99: 4000, err: 0.02 },
  stressComplex: { p95: 4000, p99: 6000, err: 0.02 },
  // SPIKE (§4.3): mismo umbral para todas las operaciones.
  spike: { p95: 2000, p99: 3000, err: 0.02 },
  // SOAK (§4.3)
  soak: { p95: 1000, p99: 1500, err: 0.005 },
};

// Construye el objeto `thresholds` de k6 para una o varias operaciones.
//
//   buildThresholds({ read: PRESETS.loadRead, write: PRESETS.loadWrite })
//
// Genera thresholds sobre las submétricas etiquetadas con `op` y, además,
// un umbral global de checks correctos > 99% (criterio de finalización §8).
export function buildThresholds(byOp) {
  const thresholds = {
    checks: ["rate>0.99"],
  };
  for (const [op, preset] of Object.entries(byOp)) {
    thresholds[`http_req_duration{op:${op}}`] = [
      `p(95)<${preset.p95}`,
      `p(99)<${preset.p99}`,
    ];
    thresholds[`http_req_failed{op:${op}}`] = [`rate<${preset.err}`];
  }
  return thresholds;
}
