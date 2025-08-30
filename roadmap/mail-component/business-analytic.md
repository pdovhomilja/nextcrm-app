# Business Analysis: Integrated Mailbox Feature

**Author:** Senior System Architect
**Date:** 2025-08-30
**Status:** Proposed

## 1. Executive Summary

This document outlines the business and functional requirements for implementing an integrated mailbox feature within the TaskHQ application. The goal is to provide users with a seamless way to access and manage their external email accounts directly within the TaskHQ ecosystem, reducing context-switching and centralizing their workflow.

The feature will allow users to connect one or more email accounts via IMAP through their profile settings. Once connected, a dedicated "Mail" section, visually and functionally based on the Shadcn UI Mail example, will become available. This interface will allow users to switch between their configured accounts, browse their mail server's folder structure, and view emails. The initial implementation will focus on providing a robust, read-only experience, laying the groundwork for future enhancements like sending emails and AI-powered mail processing.

**Business Value:**
- **Increased User Engagement:** By embedding a core daily tool (email) into the platform, we increase the time users spend within TaskHQ.
- **Enhanced Productivity:** Centralizing tasks and email reduces friction and saves users time, making our platform more valuable.
- **Competitive Differentiation:** Offers a unified workspace that goes beyond simple task management.

## 2. Goals and Objectives

- **Goal 1:** Enable users to securely connect and manage multiple external email accounts.
- **Objective 1.1:** Develop a UI in the user profile settings to add, view, and remove IMAP account configurations.
- **Objective 1.2:** Ensure all sensitive credentials (e.g., passwords, app passwords) are securely encrypted at rest in the database.

- **Goal 2:** Provide a rich, intuitive, and performant mail browsing experience.
- **Objective 2.1:** Implement a new page at `/[cid]/mail` that replicates the three-pane layout of the Shadcn UI Mail example (Account/Folder List | Mail List | Mail Viewer).
- **Objective 2.2:** Allow users to select from any of their connected mail accounts within the mail interface.
- **Objective 2.3:** Dynamically fetch and display the email folder structure from the user's mail server for the selected account.
- **Objective 2.4:** Display a list of emails for the selected folder and render the content of a selected email.

## 3. Scope

### In-Scope for this Phase (MVP)

- **User Profile:** UI for adding/removing IMAP account credentials (Host, Port, Username, Password/App Password).
- **Security:** Encryption of all stored credentials.
- **Navigation:** A new link in the main application sidebar to the mail feature.
- **Routing:** A new route at `app/(app)/[cid]/mail/page.tsx`.
- **Mail UI:**
    - A dropdown or list to switch between configured mail accounts.
    - A collapsible tree view for mail folders (Inbox, Sent, Drafts, Spam, custom folders).
    - A paginated list of emails for the selected folder, showing sender, subject, and a snippet.
    - A read-only view of the selected email's content (HTML and plain text).
- **Backend:** Server-side logic to handle IMAP connections, fetch folders, email lists, and individual email content.

### Out-of-Scope for this Phase

- **Composing/Sending Email:** No functionality for writing, replying to, or forwarding emails.
- **Email Actions:** No deleting, archiving, moving, or marking emails as read/unread on the server.
- **Search:** No server-side or client-side search functionality for emails.
- **Attachments:** No viewing or downloading of email attachments.
- **Calendar/Contact Integration:** No parsing of calendar invites or integration with contacts.
- **AI Features:** No AI-powered summarization, categorization, or task creation from emails in this phase.
- **POP3/SMTP Configuration:** The initial implementation will focus exclusively on IMAP for reading mail.

## 4. Functional Requirements

### 4.1. User Profile & IMAP Configuration
- A new "Mail Accounts" or "Integrations" tab shall be added to the user's profile settings page.
- Users shall be presented with a form to input their IMAP server details:
    - Email Address (for display purposes)
    - IMAP Host (e.g., `imap.gmail.com`)
    - IMAP Port (e.g., `993`)
    - Use TLS/SSL (boolean toggle)
    - Username
    - Password or App-Specific Password (input type `password`)
- The system must validate the connection details upon submission before saving them.
- Users shall be able to view a list of their connected accounts and have an option to remove them.

### 4.2. Navigation & Routing
- A "Mail" icon/link shall be added to the primary navigation sidebar.
- Clicking this link shall navigate the user to `/{companyId}/mail`.
- The system must handle cases where a user has not configured any mail accounts, showing a setup prompt instead of the mail client.

### 4.3. Mailbox User Interface
- The UI will be heavily based on the [Shadcn Mail Example](https://github.com/shadcn-ui/ui/tree/main/apps/www/app/(app)/examples/mail).
- **Account Selector:** A `Select` or `DropdownMenu` component will be prominently displayed, allowing the user to choose which connected account they wish to view. The list will be populated with the email addresses provided during setup.
- **Folder List:** Upon selecting an account, the system will fetch and display its folder hierarchy in a `Nav` or custom tree component.
- **Email List:** When a folder is selected, the central pane will display a list of emails, paginated to handle large mailboxes. Each item will show sender, subject, and a short preview.
- **Email Display:** Clicking an email in the list will render its content in the right-hand pane. The system must safely render HTML content to prevent XSS attacks.

## 5. Non-Functional Requirements

- **Security:** User credentials must be encrypted using a strong, modern algorithm (e.g., AES-256) before being stored in the `User` or a new dedicated database table. The encryption key must be managed securely via environment variables or a secret management service. All IMAP traffic must be over a secure TLS connection.
- **Performance:** IMAP connections can be latent. The UI must feel responsive.
    - Loading skeletons (like Shadcn's `Skeleton` component) must be used for all data-fetching states (folders, email lists, email content).
    - Email lists must be paginated, fetching no more than 50 emails at a time.
    - Caching strategies should be employed for folder structures and email lists to reduce repeated fetches.
- **Error Handling:** The system must gracefully handle IMAP connection errors, authentication failures, and timeouts, presenting clear, user-friendly error messages.
- **Usability:** The interface must be intuitive and follow the established design patterns of the TaskHQ application and Shadcn UI.

## 6. Technical Implementation Strategy

### 6.1. Data Model (Prisma Schema)
A new model will be required to store user mail configurations.

```prisma
// In prisma/schema.prisma

model UserMailAccount {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  email     String   @unique // For display and identification
  imapHost  String
  imapPort  Int
  imapUser  String
  encryptedPassword String // Store encrypted password/token
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId])
}

// Add relation to User model
model User {
  // ... existing fields
  mailAccounts UserMailAccount[]
}
```

### 6.2. Backend (Next.js Server Actions)
- **IMAP Library:** A robust library like `node-imap` will be used to handle all IMAP communications.
- **Actions:**
    - `saveUserMailAccount(data)`: Validates credentials by attempting a connection, encrypts the password, and saves the record to the database.
    - `getUserMailAccounts()`: Fetches the list of connected accounts for the logged-in user.
    - `getMailFolders(accountId)`: Fetches the folder tree for a given account.
    - `getMailList(accountId, folderName, page)`: Fetches a paginated list of emails.
    - `getMailContent(accountId, mailUid)`: Fetches the full body of a specific email.
- **Security:** All actions must be protected and can only be executed by the authenticated owner of the account.

### 6.3. Frontend (React Components)
- **`app/(app)/[cid]/mail/page.tsx`:** The main entry point, orchestrating the layout and data fetching.
- **`components/mail/account-switcher.tsx`:** Dropdown to select an active mail account.
- **`components/mail/folder-list.tsx`:** Fetches and displays the folder hierarchy for the selected account.
- **`components/mail/mail-list.tsx`:** Displays the paginated list of emails.
- **`components/mail/mail-view.tsx`:** Displays the content of the selected email, using an iframe or a library like `react-html-parser` for safe rendering.
- **`components/settings/mail-settings.tsx`:** The form and logic for managing mail accounts in the user profile.
