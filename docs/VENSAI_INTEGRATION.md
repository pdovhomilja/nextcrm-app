# VenSai CRM ↔ Admin Portal integration

Lightweight **role + venture assignment** lives in **Next CRM** (Admin → Users). Changes sync to the Admin Portal over HTTPS.

## CRM (source of truth)

- **CRM access** — checkbox per user (default on). When off, CRM sidebar modules are hidden; user can still open assigned ventures.
- **Venture access** — checkboxes per venture slug (from `VENSAI_VENTURES`).

Data: `Users.crmEnabled`, `UserVentureGrant` (run migration `20261019120000_user_venture_grants`).

## Environment (CRM)

```env
VENSAI_VENTURES=rofyt:Rofyt
VENSAI_ADMIN_PORTAL_URL=https://admin.vensailabs.in
VENSAI_ADMIN_SYNC_URL=https://admin.vensailabs.in
VENSAI_ADMIN_SYNC_SECRET=same-long-secret-as-admin-portal
```

## Environment (Admin Portal)

```env
CRM_SYNC_SECRET=same-long-secret-as-crm
```

## Sync API

`POST /api/crm/sync-access`  
Header: `Authorization: Bearer <CRM_SYNC_SECRET>`  

Body:

```json
{
  "email": "person@example.com",
  "workEmail": "person@vensailabs.in",
  "name": "Person",
  "ventureSlugs": ["rofyt"],
  "crmEnabled": true
}
```

Stored in MongoDB `vensai.crm_user_access` (for future portal login / audit).

If sync env vars are missing, CRM still saves grants locally; sync is skipped.

## User flow

1. CRM admin invites or edits user → selects ventures + CRM access.
2. CRM calls sync webhook (best effort).
3. User sees **Ventures** in CRM sidebar → links to Admin Portal venture pages (separate sign-in today).
