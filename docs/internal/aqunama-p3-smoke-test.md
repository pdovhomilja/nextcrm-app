# AQUNAMA Phase 3 — Manual Smoke Test (~15 min)

Prereqs: dev deployment, one admin/manager login (CSO) + one plain-user
login (rep) — or one admin doing both sides. A throwaway deal in a
pre_sale-kind stage.

## 1. Gate blocks unapproved deals (2 min)
- [ ] Drag the test deal into the Qualified-trigger stage on the kanban →
      error toast "Quote approval is required…"; deal stays put.
- [ ] Same via the deal's Update form → same error.

## 2. Request approval (3 min)
- [ ] Deal detail → **Request approval** → success toast; badge shows
      "Approval pending"; the button disappears.
- [ ] Second request attempt (reload → button gone; via another tab if
      open) errors "already pending".
- [ ] Manager/admin users receive the request email with queue + deal links.

## 3. Approve & pass the gate (4 min)
- [ ] As CSO: **CRM → Approvals** shows the deal (account, rep, budget,
      requested date). Approvals nav item is hidden for plain users, and
      opening /crm/approvals as a plain user redirects away.
- [ ] Approve → row disappears; rep gets the "approved" email; deal badge
      shows "Approved".
- [ ] Drag the deal into the Qualified stage → succeeds now (and the
      Phase 2 cadence run appears in Inngest).

## 4. Rejection loop (3 min)
- [ ] Flag a second test deal, request approval, then as CSO **Reject**
      with a note → rep email contains the note; badge "Rejected" (note in
      tooltip); gate still blocks; **Request approval** is available again.

## 5. Case study (3 min)
- [ ] Account detail → Case study card → **Flag as candidate** → badge
      "Candidate".
- [ ] As manager/admin: **Approve case study** → badge "Approved". Approve
      button never shows for plain users.
- [ ] **Withdraw candidacy** clears both badges (approval revoked too).
- [ ] Audit Log shows the approval-status and case-study changes.
