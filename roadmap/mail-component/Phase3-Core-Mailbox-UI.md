# Phase 3: Core Mailbox UI & Read Access

This is the most substantial phase, where the core Mailbox feature comes to life. It involves building the main three-pane UI and implementing the backend logic to connect to external IMAP servers to read and display folder structures and email lists.

## 1. User Story

As a user, I want to navigate to the mail section, select one of my connected accounts, and see a list of my email folders and the emails within them, so that I can browse my inbox and other mail folders.

## 2. Acceptance Criteria

- **GIVEN** a user clicks the "Mail" link in the main navigation **WHEN** the page loads **THEN** they are navigated to the `/[cid]/mail` route.
- **GIVEN** the user has configured at least one mail account **WHEN** the mail page loads **THEN** a layout with three vertical panes is displayed.
- **GIVEN** the user has multiple mail accounts **WHEN** the mail page loads **THEN** a dropdown or selector is present, allowing them to switch between accounts.
- **GIVEN** an account is selected **WHEN** the UI loads **THEN** a list of mail folders (e.g., Inbox, Sent, Spam) from the remote IMAP server is displayed in the first pane.
- **GIVEN** a user clicks on a mail folder **WHEN** the action is processed **THEN** a list of emails from that folder is displayed in the second pane.
- **GIVEN** a folder contains many emails **WHEN** the list is displayed **THEN** the emails are paginated to ensure good performance.
- **GIVEN** data is being fetched from the IMAP server **WHEN** the user is waiting **THEN** loading skeletons must be displayed in the respective panes.

## 3. Developer Implementation Guide

### 3.1. IMAP Connection Logic (Backend)

1.  **Install Dependency:** Add `node-imap` to the project: `pnpm add node-imap && pnpm add -D @types/node-imap`.
2.  **Create Actions File:** Create a new file `actions/mail/read-actions.ts`.
3.  **Implement `getMailFolders`:**
    - This server action takes an `accountId`.
    - It fetches the `UserMailAccount` record, ensuring it belongs to the current user.
    - It decrypts the `encryptedPassword` using the utility from Phase 1.
    - It uses `node-imap` to connect to the IMAP server with the user's credentials.
    - It fetches the list of folders and returns them in a hierarchical structure.
    - It must handle connection errors gracefully.
4.  **Implement `getMailList`:**
    - This server action takes `accountId`, `folderName`, and `page` (or cursor).
    - It performs the same connection steps as above.
    - It opens the specified `folderName`.
    - It fetches a paginated list of email headers (e.g., messages `n` to `n+50`).
    - It parses the headers to extract `uid`, `from`, `subject`, `date`, and a short snippet.
    - It returns the list of emails and pagination information (e.g., `nextPageCursor`).

### 3.2. Mailbox Page and Layout

1.  **Create Page:** Create the new mail page at `app/(app)/[cid]/mail/page.tsx`.
2.  **Add Navigation Link:** Add a link to `/` + `companyId` + `/mail` in the `AppSidebar` or `NavMain` component.
3.  **Build Layout:** Use the `Resizable` components from Shadcn UI (`ResizablePanelGroup`, `ResizablePanel`, `ResizableHandle`) to create the three-pane layout.
4.  **Orchestrator Component:** The main page component will be a server component that fetches the initial data (list of user's mail accounts) and passes it down to client components that manage the interactive state.

### 3.3. Mailbox UI Components

1.  **Account Switcher (`components/mail/account-switcher.tsx`):**
    - A client component that receives the list of accounts.
    - Uses the `Select` component to render the dropdown.
    - Manages the state of the currently selected account. This state should likely be stored in URL query params (`?account=...`) to be bookmarkable and to trigger server-side data refetching on the page.
2.  **Folder List (`components/mail/folder-list.tsx`):**
    - A client component that takes the selected `accountId` as a prop.
    - Uses a hook (e.g., `useSWR` or `useQuery`, or a simple `useEffect`) to call a server action wrapper for `getMailFolders`.
    - Displays the folders using the `Nav` component from the Shadcn Mail example.
    - Manages the state of the selected folder, also storing it in a URL query param (`&folder=...`).
3.  **Email List (`components/mail/mail-list.tsx`):**
    - A client component that takes `accountId` and `folderName` as props.
    - Fetches the paginated list of emails by calling `getMailList`.
    - Displays the emails using the `DataTable` or a custom list component.
    - Manages the state of the selected email (`&email=...` in URL).

### 4. Key Considerations

- **State Management:** Using URL query parameters (`next/navigation`'s `useRouter` and `useSearchParams`) is the recommended Next.js App Router approach for managing state that affects data fetching, as it works seamlessly with Server Components and caching.
- **IMAP Connections:** IMAP connections are stateful and can be slow. Ensure connections are properly opened and closed. Do not leave connections dangling. All IMAP logic must be strictly on the server side.
- **Loading States:** This is critical for UX. Use `Suspense` boundaries around the folder and email lists, with `Skeleton` components as fallbacks, to prevent layout shift and inform the user that content is loading.
