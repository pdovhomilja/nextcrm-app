# Phase 5: Security Hardening & Testing

## 1. Objective

The objective of this phase is to rigorously test the new multi-tenant architecture to identify and fix any potential security vulnerabilities, bugs, or regressions. The focus is on verifying data isolation between tenants and ensuring the role-based access control (RBAC) system is functioning as designed.

## 2. Testing Strategy

A combination of automated tests (unit and integration) and manual exploratory testing is required to ensure comprehensive coverage.

### 2.1. Test Environment Setup

**Instructions:**
Before testing, set up a realistic test environment in your local or staging database.

1.  **Create Company A**:
    - Create User A1 (Role: `OWNER`)
    - Create User A2 (Role: `ADMIN`)
    - Create User A3 (Role: `MEMBER`)
    - Create Board A, owned by Company A.
    - Create Task A on Board A.

2.  **Create Company B**:
    - Create User B1 (Role: `OWNER`)
    - Create User B2 (Role: `MEMBER`)
    - Create Board B, owned by Company B.
    - Create Task B on Board B.

3.  **Shared User**:
    - Invite User A1 (from Company A) to be a `MEMBER` in Company B. This is crucial for testing the company switching functionality.

### 2.2. Unit Testing

**Framework**: Vitest / Jest
**Location**: `tests/` directory

**Goal**: Test individual server actions and helper functions in isolation.

**Key Test Cases:**

- **`actions/company-actions.ts`**:
  - `switchActiveCompany`:
    - Test that it throws an error if a user tries to switch to a company they are not a member of.
  - `inviteUserToCompany`:
    - Test that a `MEMBER` role user cannot call this action successfully (should throw an auth error).
    - Test that an `ADMIN` or `OWNER` can call it successfully.
  - `removeMember`:
    - Test that a `MEMBER` cannot remove another member.
    - Test that an `ADMIN` can remove a `MEMBER`.
    - Test that an `OWNER` can remove an `ADMIN` or `MEMBER`.
    - Add a test case for business logic: an `OWNER` cannot remove the last `OWNER` from a company.

- **`actions/tasks/*.ts` / `actions/boards/*.ts`**:
  - For each action (e.g., `getTask`, `createBoard`, `deleteTask`), create a mock `auth` session.
  - Call the action with an ID for an item that belongs to a _different_ company than the one in the mock session.
  - **Assert that the function returns `null` or throws an explicit `Not Found` or `Unauthorized` error.** This verifies the `companyId` check is working.

### 2.3. Integration / End-to-End Testing

**Framework**: Playwright / Cypress
**Goal**: Simulate real user flows to test the complete system, from UI interaction to database access.

**Key Test Scenarios:**

1.  **Data Isolation Test (CRITICAL):**
    - Log in as **User A1**.
    - Navigate to the dashboard for Company A (`/app/[companyA_id]/dashboard`). Assert that you can see Board A.
    - Manually change the URL in the browser to try and access Board B (`/app/[companyA_id]/tasks/[boardB_id]`).
    - **Assert**: The middleware should either redirect, or the page should show a "Board not found" or "Access Denied" message. At no point should data from Board B be visible.
    - Repeat for API calls: Use a tool to directly call the `getBoard` endpoint with Board B's ID while authenticated as User A1. Assert the API returns a 403/404 error.

2.  **Role-Based Access Control (RBAC) Test:**
    - Log in as **User A3 (`MEMBER`)**.
    - Navigate to the company settings page.
    - **Assert**: The "Invite User" button and the "Remove Member" actions are not visible or are disabled.
    - Attempt to call the `inviteUserToCompany` server action via the browser console. Assert that the call fails with an authorization error.
    - Log in as **User A2 (`ADMIN`)**.
    - Navigate to the company settings page.
    - **Assert**: The management controls are visible. Invite a new user. Remove User A3. Assert these actions are successful.

3.  **Company Switching Test:**
    - Log in as **User A1** (who is a member of both companies).
    - Initially, the active company should be Company A. View the dashboard and confirm you see Board A.
    - Use the company switcher UI to switch to **Company B**.
    - **Assert**: The page refreshes, the URL now contains Company B's ID, and the dashboard now shows Board B.
    - Navigate to the settings page. Assert that you see the members of Company B and your role is `MEMBER` (no admin controls visible).

### 2.4. Manual Penetration Testing

**Goal**: Manually try to break the system's security assumptions.

**Checklist:**

- [ ] **IDOR (Insecure Direct Object Reference):** As a logged-in user, try to guess the CUIDs/UUIDs of resources from another company and access them via URL or API calls.
- [ ] **Privilege Escalation:** As a `MEMBER`, try to perform admin actions by intercepting requests (e.g., with browser dev tools) and changing payloads before they are sent.
- [ ] **Invitation Token Hijacking:** Can you accept an invitation intended for another email address?
- [ ] **Session Tampering:** Can you modify the session token on the client-side to change your `activeCompanyId` to something you don't have access to? (The backend JWT verification should prevent this, but it must be tested).

## 4. Definition of Done

- All unit tests for server actions are written and passing.
- All critical integration tests (Data Isolation, RBAC, Switching) are written and passing.
- The manual penetration testing checklist has been completed, and any identified vulnerabilities have been addressed.
- The development team is confident that the multi-tenant architecture is secure and robust.
