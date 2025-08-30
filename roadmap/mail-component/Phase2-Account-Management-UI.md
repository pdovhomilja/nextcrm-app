# Phase 2: User Profile UI for Mail Account Management

With the backend foundation in place, this phase focuses on creating the user-facing interface within the profile settings. This will allow users to interact with the backend actions created in Phase 1 to manage their connected mail accounts.

## 1. User Story

As a user, I want to add, view, and remove my IMAP email accounts in my profile settings so that I can easily and securely manage which accounts the application has access to.

## 2. Acceptance Criteria

- **GIVEN** a user navigates to their profile/settings page **WHEN** the page loads **THEN** a "Mail Accounts" or "Integrations" section must be visible.
- **GIVEN** the user is in the "Mail Accounts" section **WHEN** they click "Add Account" **THEN** a form with fields for Email, IMAP Host, Port, User, and Password must be displayed.
- **GIVEN** a user submits the form with valid details **WHEN** the submission is processed **THEN** a success notification (e.g., a toast) should appear, and the new account should be visible in the list of connected accounts.
- **GIVEN** a user submits the form with invalid details **WHEN** the submission fails **THEN** a descriptive error message must be shown.
- **GIVEN** a user views their list of connected accounts **WHEN** they click a "Remove" or "Delete" button **THEN** they should be asked for confirmation, and upon confirming, the account is removed from the list.

## 3. Developer Implementation Guide

### 3.1. Component Scaffolding

1.  **Create Main Component:** Create a new file at `components/settings/mail-settings.tsx`. This component will be the main container for this feature.
2.  **Create Form Component:** Create `components/settings/mail-account-form.tsx`. This will house the form for adding a new account.
3.  **Create List Component:** Create `components/settings/mail-account-list.tsx`. This will display the already connected accounts.
4.  **Integrate into Settings Page:** Locate the main user settings page (e.g., `app/(app)/[cid]/settings/page.tsx` or similar) and embed the `MailSettings` component within a `Tabs` or `Card` component, labeled appropriately.

### 3.2. Mail Account Form (`mail-account-form.tsx`)

1.  **Use Shadcn Form:** Leverage the `Form` component from `components/ui/form`, which is built on `react-hook-form` and `zod` for validation.
2.  **Define Schema:** Create a `zod` schema to validate the form fields (email, host, port, user, password).
3.  **Build Form:** Use Shadcn UI components like `Input`, `PasswordInput` (if you create one, otherwise `Input type="password"`), and `Button` to build the form structure.
4.  **Handle Submission:** In the `onSubmit` handler provided by `react-hook-form`, call the `saveUserMailAccount` server action created in Phase 1. Pass the validated form data to it.
5.  **Provide Feedback:** Use the `sonner` component (`components/ui/sonner.tsx`) to display success or error toasts based on the result of the server action. Disable the submit button while the action is pending.

### 3.3. Mail Account List (`mail-account-list.tsx`)

1.  **Fetch Data:** This component should be a React Server Component (RSC) by default. Directly call the `getUserMailAccounts` server action from Phase 1 at the top of the component to fetch the user's accounts.
2.  **Display Data:** Map over the returned accounts and display them in a list.
3.  **Use `Card` Component:** Render each account within a `Card` component. Display the email address and IMAP host.
4.  **Implement Deletion:**
    - Add a `Button` with a "Remove" or trash icon to each card.
    - To handle the client-side interaction (confirmation dialog) and the subsequent server action call, you will need a small client component.
    - Create a `RemoveAccountButton.tsx` component that uses the `use client` directive.
    - This component will render the button and use the `AlertDialog` component from Shadcn to confirm the deletion.
    - On confirmation, it will call the `deleteUserMailAccount` server action, passing the `accountId`.
    - Upon successful deletion, it should trigger a refresh of the list (e.g., using `router.refresh()` from `next/navigation`).

### 4. Key Considerations

- **Client vs. Server Components:** Be mindful of the `"use client"` directive. The list itself can be a Server Component to fetch data initially, but the interactive elements like the delete button will require a Client Component wrapper to handle state and user events.
- **User Experience:** Provide clear loading states for the list and feedback for form submissions. A pending state on the "Add Account" button is crucial.
- **Component Reusability:** The form and list components should be self-contained and reusable.
