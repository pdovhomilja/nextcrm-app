# Phase 1: Backend Setup and Security

This phase focuses on establishing the non-negotiable backend foundation for the Mailbox feature. Before any UI is built, we must have a secure and reliable way to store, manage, and access user mail account credentials.

## 1. User Story

As a developer, I need the backend infrastructure to securely store and manage user mail account credentials so that the application can later connect to IMAP servers on the user's behalf.

## 2. Acceptance Criteria

- **GIVEN** a developer inspects the Prisma schema **WHEN** the schema is reviewed **THEN** a `UserMailAccount` model with appropriate fields and relations must be created and present.
- **GIVEN** a user's IMAP password is provided **WHEN** it is stored in the database **THEN** it must be encrypted using a strong, reversible encryption algorithm.
- **GIVEN** the system needs to connect to an IMAP server **WHEN** the password is required **THEN** it must be decrypted in memory on the server-side only.
- **GIVEN** a developer needs to manage mail accounts **WHEN** server actions are invoked **THEN** actions for creating, reading, and deleting `UserMailAccount` records must be available and function correctly.
- **GIVEN** a user attempts to access mail account data **WHEN** a server action is called **THEN** the action must verify that the user is authenticated and is the owner of the requested data.

## 3. Developer Implementation Guide

### 3.1. Database Schema (Prisma)

1.  **Modify Schema:** Open `prisma/schema.prisma`.
2.  **Add Model:** Add the `UserMailAccount` model. Insert it after the `User` model (around line 71). Ensure the relation to the `User` model is correctly established.

    ```prisma
    model UserMailAccount {
      id                  String   @id @default(cuid())
      userId              String
      user                User     @relation(fields: [userId], references: [id], onDelete: Cascade)
      email               String   @unique
      imapHost            String
      imapPort            Int
      imapUser            String
      encryptedPassword   String
      createdAt           DateTime @default(now())
      updatedAt           DateTime @updatedAt

      @@index([userId])
      @@map("user_mail_accounts")
    }
    ```

3.  **Update User Model:** Add the corresponding relation field to the `User` model (around line 65, after `sessions Session[]`).
    ```prisma
    model User {
      // ... existing fields (id through sessions)
      mailAccounts        UserMailAccount[]

      @@index([emailVerificationToken])
      @@index([company_id])
      @@map("users")
    }
    ```
4.  **Create Migration:** Run the command `pnpm prisma migrate dev --name add_user_mail_account` to generate and apply the database migration.

### 3.2. Security & Encryption

1.  **Create Utility:** Create a new file at `lib/security/encryption.ts`.
2.  **Add Environment Variables:** Add `ENCRYPTION_KEY` and `ENCRYPTION_IV` to your `.env` file. Generate secure, random 32-byte and 16-byte strings for these, respectively.
3.  **Implement Functions:** Inside `encryption.ts`, implement `encrypt(text)` and `decrypt(encryptedText)` functions using Node.js's built-in `crypto` module (e.g., `createCipheriv` and `createDecipheriv` with `aes-256-cbc`). These functions will read the key and IV from the environment variables.

### 3.3. Server Actions

1.  **Create File:** Create a new file at `actions/mail/account-actions.ts`.
2.  **Implement `saveUserMailAccount`:**
    - The function should accept an object containing the raw IMAP details.
    - It must first get the current user's session using `auth()` from `auth.ts`. If no user, throw an error.
    - It will call the `encrypt()` utility to encrypt the provided password.
    - It will then use `prisma.userMailAccount.create()` to save the new record, associating it with the `userId` from the session.
    - **Do not** store the raw password.
3.  **Implement `getUserMailAccounts`:**
    - Get the current user's session.
    - Use `prisma.userMailAccount.findMany()` with a `where` clause to fetch accounts belonging only to the current `userId`.
    - **Do not** return the `encryptedPassword` field to the client. Use a `select` statement in Prisma to exclude it.
4.  **Implement `deleteUserMailAccount`:**
    - The function should accept an `accountId`.
    - Get the current user's session.
    - Use `prisma.userMailAccount.delete()` with a `where` clause that checks for both the `id` of the account AND the `userId` of the current user. This is a critical security check to ensure users can only delete their own accounts.

### 4. Key Considerations

- **Security First:** The principle of least privilege is paramount. Never expose encrypted passwords outside of the server-side actions that need to decrypt them for an IMAP connection. The client should never see them.
- **Error Handling:** Ensure Prisma queries and encryption functions are wrapped in `try...catch` blocks to handle potential failures gracefully.
- **Validation:** While the UI will handle form validation later, add basic server-side validation (e.g., ensuring required fields are not empty) in the `saveUserMailAccount` action as a second layer of defense.
