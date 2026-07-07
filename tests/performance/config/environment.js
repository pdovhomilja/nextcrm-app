// Configuración de entorno para las pruebas de rendimiento (k6) de NextCRM.
//
// Todos los valores se pueden sobreescribir en tiempo de ejecución con
// `k6 run -e CLAVE=valor script.js`. Esto permite apuntar la misma suite al
// entorno local (docker-compose.dev.yaml) o al entorno de staging descrito en
// el Plan de Pruebas de Rendimiento §5.6 sin tocar el código.

// URL base de la aplicación bajo prueba (Next.js).
export const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

// Locale con el que next-intl prefija todas las rutas del CRM.
// El default del proyecto es "en" (ver i18n/routing.ts).
export const LOCALE = __ENV.LOCALE || "en";

// Usuario admin sembrado por `prisma db seed` (ver .env.integration TEST_USER_EMAIL).
export const ADMIN_EMAIL = __ENV.ADMIN_EMAIL || "admin@example.com";

// Estrategia de autenticación (Diseño §3.3): cookie de sesión fija.
// Si se provee SESSION_COOKIE se usa tal cual y se omite el flujo OTP; de lo
// contrario lib/auth.js ejecuta el sign-in OTP contra el servidor de pruebas.
export const SESSION_COOKIE = __ENV.SESSION_COOKIE || "";

// Nombre de la cookie de sesión de Better Auth.
export const SESSION_COOKIE_NAME = "better-auth.session_token";

// Rutas de páginas del CRM (Server Components servidos por GET).
// Se prefijan con el locale en lib/client.js#readPage.
export const ROUTES = {
  dashboard: "/crm/dashboard",
  accounts: "/crm/accounts",
  contacts: "/crm/contacts",
  leads: "/crm/leads",
  opportunities: "/crm/opportunities",
  contracts: "/crm/contracts",
};

// Devuelve una ruta absoluta ya prefijada con el locale.
export function localized(path) {
  return `/${LOCALE}${path}`;
}
