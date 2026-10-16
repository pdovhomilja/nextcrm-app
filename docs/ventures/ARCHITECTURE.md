# Venture control plane — architecture

## Layers

| Layer | Host (convention) | Role |
|-------|-------------------|------|
| CRM | `crm.vensailabs.in` | Register ventures, targets, test connectivity, trigger provisioning, audit |
| ROFYT ERP | `rofyt.vensailabs.in` | Car rental ERP + target provisioning API |
| ROFYT Admin | `admin-rofyt.vensailabs.in` | Admin portal + separate provisioning API if identity is split |

CRM **never** writes to ROFYT databases directly.

## Target provisioning API (each app)

```
GET  /api/health
GET  /api/internal/provisioning/status   (optional readiness)
POST /api/internal/provisioning/admin
```

**Auth:** `Authorization: Bearer <provisioning-secret>` (per target, rotatable; stored encrypted in CRM).

**POST body (logical):**

```json
{
  "ventureKey": "rofyt",
  "targetKey": "erp",
  "adminEmail": "admin@example.com",
  "adminPassword": "…",
  "idempotencyKey": "uuid",
  "correlationId": "uuid"
}
```

**Responses:** `{ success, status: seeded|already_exists|failed, message, adminEmail }` — never return password or token.

## CRM outbound safety

- Allow only `https://` URLs under configured suffix (default `vensailabs.in`).
- Block private/loopback/metadata IPs after DNS resolve.
- Fixed paths: health `GET`, provisioning `POST` only.
- Timeouts, no redirect follow (or strict redirect allowlist).
- Idempotency keys on seed operations.

## Status separation

| Status | Meaning |
|--------|---------|
| Venture registered | Row exists in CRM |
| Domain assigned | Subdomain field set — not proof of DNS |
| Target reachable | Health check succeeded |
| Provisioning ready | Status endpoint OK |
| Admin seeded | Target returned `seeded` |
