# Phase 4: Email Content View & Polish

This final phase completes the core user journey by allowing users to read the content of their emails. It also includes time for polishing the UI, ensuring all states (loading, error, empty) are handled gracefully, and performing a final security review.

## 1. User Story

As a user, after selecting an email from the list, I want to see its full content displayed in a dedicated panel so that I can read my messages without leaving the application.

## 2. Acceptance Criteria

- **GIVEN** a user has selected an email from the list in the second pane **WHEN** the selection is made **THEN** the full content of that email is fetched and displayed in the third pane.
- **GIVEN** an email is selected **WHEN** its content is being fetched **THEN** a loading skeleton is displayed in the content pane.
- **GIVEN** an email contains HTML content **WHEN** it is displayed **THEN** it must be rendered as HTML, and any potentially malicious code must be sanitized.
- **GIVEN** an email is in plain text **WHEN** it is displayed **THEN** it must be rendered correctly with line breaks and spacing preserved.
- **GIVEN** a user has not yet selected an email **WHEN** the mail page is viewed **THEN** the third pane displays a message like "Select an email to read".
- **GIVEN** a folder contains no emails **WHEN** it is selected **THEN** the email list pane displays a message like "This folder is empty".

## 3. Developer Implementation Guide

### 3.1. Backend Action for Email Content

1.  **Implement `getMailContent`:** In `actions/mail/read-actions.ts`, create a new server action `getMailContent(accountId, mailUid, folderName)`.
2.  **IMAP Logic:**
    - This action will connect to the IMAP server using the same secure method as in Phase 3.
    - It will open the specified `folderName`.
    - It will fetch the full body structure of the email with the given `mailUid`.
    - It needs to handle multi-part emails (e.g., `text/plain` and `text/html`). Prioritize displaying the `text/html` part if available, otherwise fall back to `text/plain`.
    - The action should return the content of the email body as a string.

### 3.2. Email View Component

1.  **Create Component:** Create a new file `components/mail/mail-view.tsx`.
2.  **Data Fetching:** This component will receive the selected `accountId`, `mailUid`, and `folderName` as props (likely derived from the URL query params managed by the parent page).
3.  **Conditional Rendering:**
    - If `mailUid` is not present, display a placeholder message like "Select a message to read".
    - If `mailUid` is present, call the `getMailContent` server action.
4.  **Use Suspense:** Wrap the data-fetching logic in a `<Suspense>` boundary to show a `Skeleton` component while the email content is loading.

### 3.3. Secure HTML Rendering

1.  **Install Sanitizer:** Add a DOM sanitizer library to prevent XSS attacks from malicious emails. `dompurify` is a standard choice. `pnpm add dompurify && pnpm add -D @types/dompurify`.
2.  **Create Utility:** It's best to create a client-side component for rendering the sanitized HTML, as `dompurify` needs access to DOM APIs.
3.  **Create `components/mail/safe-html-renderer.tsx`:**
    - This component must start with the `"use client"` directive.
    - It accepts the raw HTML string as a prop.
    - It uses `dompurify.sanitize()` to clean the HTML.
    - It renders the cleaned HTML using `dangerouslySetInnerHTML={{ __html: sanitizedHtml }}`.
4.  **Integrate:** In `mail-view.tsx`, pass the fetched HTML content to this `SafeHtmlRenderer` component.

### 3.4. UI Polish and Edge Cases

1.  **Empty States:**
    - In `mail-list.tsx`, if the `getMailList` action returns an empty array, render a component that says "No emails in this folder." instead of the table/list.
    - In the main mail page, if `getUserMailAccounts` returns empty, don't show the three-pane layout at all. Instead, show a prominent link to the settings page: "You haven't connected any mail accounts yet. [Go to Settings]".
2.  **Error States:** Wrap all data-fetching calls in Error Boundaries or use `try...catch` to display user-friendly error messages (e.g., "Failed to connect to IMAP server. Please check your credentials in Settings.").
3.  **Refine Layout:** Ensure the `Resizable` panels have sensible default and minimum sizes. Test on different screen sizes to ensure the layout is usable.

### 4. Key Considerations

- **Security is Non-Negotiable:** Sanitizing HTML is not optional. Failure to do so creates a critical XSS vulnerability. All user-generated content, including email bodies, must be treated as untrusted.
- **Final Review:** Before concluding this phase, conduct a full review of the feature, clicking through every state and testing every interaction to ensure a smooth and professional user experience.
