# Gmail Quick Connect Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users connect their Gmail account (any locale) via IMAP/SMTP with a one-click preset, App Password guidance, and a folder-discovery tool — and make the sync resilient when the sent folder name is wrong.

**Architecture:** Three layers of work:
1. **`sync-account.ts`** — make sent-folder sync fault-tolerant so INBOX still syncs even when `sentFolderName` is wrong
2. **`actions/emails/accounts.ts`** — add a `listImapFolders` server action that returns the user's actual mailbox names
3. **`EmailAccountsList.tsx`** — add Gmail preset buttons, App Password alert, and a "Discover" button next to Sent Folder that populates a dropdown from the live IMAP server

**Root cause of the bug:** `[Gmail]/Sent Mail` is Gmail's English sent folder name. Non-English Gmail accounts use a localized name (e.g. Czech: `[Gmail]/Odeslaná pošta`). The sync crashes the entire `Promise.all` because `imap.openBox` rejects on an unknown mailbox name, taking INBOX sync down with it.

**Tech Stack:** React (client component), shadcn/ui (Button, Alert, Select), Lucide icons, `imap` npm package (already installed).

---

## File Map

| Action | File |
|--------|------|
| Modify | `inngest/functions/emails/sync-account.ts` |
| Modify | `actions/emails/accounts.ts` |
| Modify | `app/[locale]/(routes)/profile/components/EmailAccountsList.tsx` |

---

### Task 1: Make sent-folder sync fault-tolerant

**Files:**
- Modify: `inngest/functions/emails/sync-account.ts`

Currently `searchFolder` rejects on `imap.openBox` error, which crashes the outer `Promise.all`. Replace the sent-folder call with a safe wrapper that returns an empty result instead of throwing.

- [ ] **Step 1: Add `searchFolderSafe` wrapper just after `searchFolder` (line 32 of `sync-account.ts`)**

```ts
/** Like searchFolder but returns empty result instead of throwing on unknown mailbox. */
async function searchFolderSafe(
  account: { username: string; password: string; imapHost: string; imapPort: number; imapSsl: boolean },
  folderName: string,
  lastUid: number
): Promise<{ uids: number[]; highestUid: number; folderMissing?: boolean }> {
  const { connectImap } = await import("@/inngest/lib/imap-utils");
  const imap = await connectImap(account);
  try {
    return await searchFolder(imap, folderName, lastUid);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[sync-account] Sent folder "${folderName}" not found, skipping: ${msg}`);
    return { uids: [], highestUid: lastUid, folderMissing: true };
  } finally {
    imap.end();
  }
}
```

- [ ] **Step 2: Replace the sent-folder path in `search-uids` step**

In the `search-uids` step (around lines 54–74), replace the `connectImap(acc).then(async (imap) => { ... searchFolder(imap, sentFolder, ...) })` call with:

```ts
const [inbox, sent] = await Promise.all([
  connectImap(acc).then(async (imap) => {
    try { return await searchFolder(imap, "INBOX", account.inboxLastUid ?? 0); }
    finally { imap.end(); }
  }),
  searchFolderSafe(acc, sentFolder, account.sentLastUid ?? 0),
]);
```

Note: `searchFolderSafe` handles its own `connectImap` + `imap.end()`, so do not wrap it with another `connectImap`.

- [ ] **Step 3: Remove now-duplicate import of `connectImap` inside `searchFolderSafe`**

`connectImap` is already imported at the top of the file. Remove the dynamic `import` inside `searchFolderSafe` and use the top-level import directly:

```ts
async function searchFolderSafe(
  account: { username: string; password: string; imapHost: string; imapPort: number; imapSsl: boolean },
  folderName: string,
  lastUid: number
): Promise<{ uids: number[]; highestUid: number; folderMissing?: boolean }> {
  const imap = await connectImap(account);
  try {
    return await searchFolder(imap, folderName, lastUid);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[sync-account] Sent folder "${folderName}" not found, skipping: ${msg}`);
    return { uids: [], highestUid: lastUid, folderMissing: true };
  } finally {
    imap.end();
  }
}
```

- [ ] **Step 4: Verify the fix compiles**

```bash
cd /Users/pdovhomilja/development/Next.js/nextcrm-app && pnpm tsc --noEmit 2>&1 | head -30
```

Expected: no errors in `sync-account.ts`

- [ ] **Step 5: Commit**

```bash
git add inngest/functions/emails/sync-account.ts
git commit -m "fix: make sent-folder sync fault-tolerant — INBOX syncs even when sent folder name is wrong"
```

---

### Task 2: Add `listImapFolders` server action

**Files:**
- Modify: `actions/emails/accounts.ts`

Add a new exported server action that connects to IMAP with provided credentials and returns the flat list of mailbox names. This powers the "Discover" button in the UI.

- [ ] **Step 1: Add the `listImapFolders` export at the end of `actions/emails/accounts.ts`**

```ts
type ListFoldersInput = {
  imapHost: string;
  imapPort: number;
  imapSsl: boolean;
  username: string;
  password: string;
};

export async function listImapFolders(
  input: ListFoldersInput
): Promise<{ ok: true; folders: string[] } | { ok: false; error: string }> {
  await requireSession();

  return new Promise((resolve) => {
    const Imap = require("imap") as typeof import("imap");
    const imap = new Imap({
      user: input.username,
      password: input.password,
      host: input.imapHost,
      port: input.imapPort,
      tls: input.imapSsl,
      tlsOptions: { rejectUnauthorized: false },
      authTimeout: 8000,
      connTimeout: 8000,
    });

    imap.once("ready", () => {
      imap.getBoxes("", (err, boxes) => {
        imap.end();
        if (err) return resolve({ ok: false, error: err.message });

        // Flatten the nested box tree into dot-separated paths
        const names: string[] = [];
        function walk(node: Record<string, Imap.MailBoxes[string]>, prefix: string) {
          for (const [name, box] of Object.entries(node)) {
            const full = prefix ? `${prefix}${box.delimiter ?? "/"}${name}` : name;
            names.push(full);
            if (box.children) walk(box.children as Record<string, Imap.MailBoxes[string]>, full);
          }
        }
        walk(boxes as Record<string, Imap.MailBoxes[string]>, "");
        resolve({ ok: true, folders: names.sort() });
      });
    });

    imap.once("error", (err: Error) => resolve({ ok: false, error: err.message }));
    imap.connect();

    setTimeout(() => resolve({ ok: false, error: "Connection timed out" }), 10000);
  });
}
```

- [ ] **Step 2: Verify the action compiles**

```bash
cd /Users/pdovhomilja/development/Next.js/nextcrm-app && pnpm tsc --noEmit 2>&1 | head -30
```

Expected: no new errors

- [ ] **Step 3: Commit**

```bash
git add actions/emails/accounts.ts
git commit -m "feat: add listImapFolders server action for folder discovery"
```

---

### Task 3: Gmail preset button + App Password alert in the dialog

**Files:**
- Modify: `app/[locale]/(routes)/profile/components/EmailAccountsList.tsx`

- [ ] **Step 1: Add `provider` state and `applyGmailPreset` handler**

Below the existing `useState` declarations (after line 46), add:

```tsx
const [provider, setProvider] = useState<"gmail" | "generic">("generic");

function applyGmailPreset() {
  setProvider("gmail");
  setForm((f) => ({
    ...f,
    label: f.label || "Gmail",
    imapHost: "imap.gmail.com",
    imapPort: "993",
    imapSsl: true,
    smtpHost: "smtp.gmail.com",
    smtpPort: "465",
    smtpSsl: true,
    sentFolderName: "[Gmail]/Sent Mail",
  }));
}
```

- [ ] **Step 2: Add Alert + Info imports**

Add to the existing import block at the top:

```tsx
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
```

- [ ] **Step 3: Reset `provider` when dialog closes**

Update the `<Dialog onOpenChange>`:

```tsx
<Dialog
  open={open}
  onOpenChange={(v) => {
    setOpen(v);
    if (!v) setProvider("generic");
  }}
>
```

- [ ] **Step 4: Update `DialogTitle` to reflect provider**

```tsx
<DialogTitle>
  {provider === "gmail" ? "Connect Gmail Account" : "Connect IMAP Account"}
</DialogTitle>
```

- [ ] **Step 5: Replace the form body inside `<DialogContent>`**

Replace the entire `<div className="space-y-3">` contents with:

```tsx
<div className="space-y-3">
  {/* Provider quick-select */}
  <div className="flex gap-2 pb-1">
    <Button
      type="button"
      variant={provider === "gmail" ? "default" : "outline"}
      size="sm"
      className="gap-1.5"
      onClick={applyGmailPreset}
    >
      <svg width="14" height="14" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#EA4335" d="M24 9.5c3.2 0 5.9 1.1 8.1 2.9l6-6C34.5 3.1 29.6 1 24 1 14.8 1 7 6.7 3.7 14.7l7 5.4C12.4 14 17.7 9.5 24 9.5z"/>
        <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.4c-.5 2.8-2.1 5.2-4.5 6.8l7 5.4C42.9 37.1 46.1 31.3 46.1 24.5z"/>
        <path fill="#FBBC05" d="M10.7 28.5A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.1.7-4.5l-7-5.4A23.5 23.5 0 0 0 .5 24c0 3.8.9 7.3 2.7 10.4l7-5.9z"/>
        <path fill="#34A853" d="M24 46.5c5.6 0 10.3-1.8 13.7-5l-7-5.4c-1.9 1.2-4.2 2-6.7 2-6.3 0-11.6-4.5-13.3-10.5l-7 5.4C7 41.8 14.8 46.5 24 46.5z"/>
      </svg>
      Connect Gmail
    </Button>
    <Button
      type="button"
      variant={provider === "generic" ? "default" : "outline"}
      size="sm"
      onClick={() => {
        setProvider("generic");
        setForm((f) => ({
          ...f,
          label: f.label === "Gmail" ? "" : f.label,
          imapHost: f.imapHost === "imap.gmail.com" ? "" : f.imapHost,
          smtpHost: f.smtpHost === "smtp.gmail.com" ? "" : f.smtpHost,
          sentFolderName: f.sentFolderName === "[Gmail]/Sent Mail" ? "Sent" : f.sentFolderName,
        }));
      }}
    >
      Other IMAP
    </Button>
  </div>

  {/* All fields except sentFolderName and password */}
  {(
    [
      { key: "label", label: "Label (e.g. Work Gmail)", type: "text" },
      { key: "imapHost", label: "IMAP Host", type: "text" },
      { key: "imapPort", label: "IMAP Port", type: "number" },
      { key: "smtpHost", label: "SMTP Host", type: "text" },
      { key: "smtpPort", label: "SMTP Port", type: "number" },
      { key: "username", label: "Username / Email", type: "email" },
    ] as const
  ).map(({ key, label, type }) => (
    <div key={key} className="space-y-1">
      <Label htmlFor={key}>{label}</Label>
      <Input
        id={key}
        type={type}
        value={form[key] as string}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
      />
    </div>
  ))}

  {/* App Password hint for Gmail */}
  {provider === "gmail" && (
    <Alert className="border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100">
      <Info className="h-4 w-4 shrink-0" />
      <AlertDescription className="text-xs leading-relaxed">
        Gmail requires a <strong>16-character App Password</strong> — your regular Gmail password won&apos;t work.{" "}
        <a
          href="https://myaccount.google.com/apppasswords"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium underline underline-offset-2"
        >
          Create one here
        </a>{" "}
        (Google Account → Security → App Passwords). Enter it below.
      </AlertDescription>
    </Alert>
  )}

  {/* Password field */}
  <div className="space-y-1">
    <Label htmlFor="password">
      {provider === "gmail" ? "App Password (16 characters)" : "Password"}
    </Label>
    <Input
      id="password"
      type="password"
      value={form.password}
      onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
      placeholder={provider === "gmail" ? "xxxx xxxx xxxx xxxx" : ""}
    />
  </div>

  {/* Sent Folder Name — rendered separately so Discover button can sit beside it */}
  <div className="space-y-1">
    <Label htmlFor="sentFolderName">Sent Folder Name</Label>
    <Input
      id="sentFolderName"
      type="text"
      value={form.sentFolderName}
      onChange={(e) => setForm((f) => ({ ...f, sentFolderName: e.target.value }))}
      placeholder='e.g. Sent or [Gmail]/Sent Mail'
    />
  </div>

  {/* SSL toggles */}
  <div className="flex items-center gap-2">
    <Switch
      id="imapSsl"
      checked={form.imapSsl}
      onCheckedChange={(v) => setForm((f) => ({ ...f, imapSsl: v }))}
    />
    <Label htmlFor="imapSsl">IMAP SSL</Label>
    <Switch
      id="smtpSsl"
      checked={form.smtpSsl}
      onCheckedChange={(v) => setForm((f) => ({ ...f, smtpSsl: v }))}
      className="ml-4"
    />
    <Label htmlFor="smtpSsl">SMTP SSL</Label>
  </div>

  {testResult && (
    <p
      className={`text-sm ${testResult.startsWith("✓") ? "text-green-600" : "text-destructive"}`}
    >
      {testResult}
    </p>
  )}
  <div className="flex gap-2 pt-2">
    <Button variant="outline" size="sm" onClick={handleTest} disabled={testing}>
      {testing ? "Testing…" : "Test Connection"}
    </Button>
    <Button size="sm" onClick={handleCreate}>
      Save
    </Button>
  </div>
</div>
```

- [ ] **Step 6: Verify in browser**

1. Open `http://localhost:3000/en/profile?tab=emails` → "Add Email Account"
2. Click "Connect Gmail" → IMAP/SMTP fields fill, blue App Password alert appears
3. Click "Other IMAP" → Gmail fields clear, alert disappears
4. Enter real Gmail + App Password → "Test Connection" → `✓ Connection successful`

- [ ] **Step 7: Commit**

```bash
git add app/[locale]/\(routes\)/profile/components/EmailAccountsList.tsx
git commit -m "feat: Gmail preset, App Password guide in email account dialog"
```

---

### Task 4: Add "Discover" button to populate Sent Folder from live IMAP

**Files:**
- Modify: `app/[locale]/(routes)/profile/components/EmailAccountsList.tsx`

After entering credentials and testing the connection, the user can click "Discover Folders" to see their actual mailbox names and pick the correct sent folder.

- [ ] **Step 1: Add `listImapFolders` to the import from `@/actions/emails/accounts`**

```tsx
import {
  createEmailAccount,
  deleteEmailAccount,
  setEmailAccountActive,
  testEmailConnection,
  listImapFolders,
} from "@/actions/emails/accounts";
```

- [ ] **Step 2: Add discovery state below existing state declarations**

```tsx
const [discovering, setDiscovering] = useState(false);
const [folders, setFolders] = useState<string[]>([]);
const [discoverError, setDiscoverError] = useState<string | null>(null);
```

- [ ] **Step 3: Add `handleDiscover` handler**

```tsx
async function handleDiscover() {
  setDiscovering(true);
  setDiscoverError(null);
  setFolders([]);
  const result = await listImapFolders({
    imapHost: form.imapHost,
    imapPort: Number(form.imapPort),
    imapSsl: form.imapSsl,
    username: form.username,
    password: form.password,
  });
  setDiscovering(false);
  if (!result.ok) {
    setDiscoverError(result.error ?? "Failed to list folders");
    return;
  }
  setFolders(result.folders);
}
```

- [ ] **Step 4: Replace the Sent Folder Name field with a discover-enabled version**

Replace the static `<Input id="sentFolderName" ...>` block added in Task 3 Step 5 with:

```tsx
{/* Sent Folder Name with Discover */}
<div className="space-y-1">
  <div className="flex items-center justify-between">
    <Label htmlFor="sentFolderName">Sent Folder Name</Label>
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-6 px-2 text-xs"
      disabled={discovering || !form.imapHost || !form.username || !form.password}
      onClick={handleDiscover}
    >
      {discovering ? "Discovering…" : "Discover folders"}
    </Button>
  </div>
  {folders.length > 0 ? (
    <select
      id="sentFolderName"
      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      value={form.sentFolderName}
      onChange={(e) => setForm((f) => ({ ...f, sentFolderName: e.target.value }))}
    >
      {folders.map((f) => (
        <option key={f} value={f}>{f}</option>
      ))}
    </select>
  ) : (
    <Input
      id="sentFolderName"
      type="text"
      value={form.sentFolderName}
      onChange={(e) => setForm((f) => ({ ...f, sentFolderName: e.target.value }))}
      placeholder='e.g. Sent or [Gmail]/Sent Mail'
    />
  )}
  {discoverError && (
    <p className="text-xs text-destructive">{discoverError}</p>
  )}
</div>
```

- [ ] **Step 5: Reset discovery state when dialog closes**

Update `onOpenChange`:

```tsx
onOpenChange={(v) => {
  setOpen(v);
  if (!v) {
    setProvider("generic");
    setFolders([]);
    setDiscoverError(null);
  }
}}
```

- [ ] **Step 6: Verify end-to-end**

1. Open dialog → "Connect Gmail" → fill in Gmail address + App Password
2. Click "Discover folders" → dropdown appears with actual Gmail mailbox names (e.g. `[Gmail]/Odeslaná pošta` for Czech)
3. Select the correct sent folder → save account → sync → no "Unknown Mailbox" error

- [ ] **Step 7: Commit**

```bash
git add app/[locale]/\(routes\)/profile/components/EmailAccountsList.tsx
git commit -m "feat: discover IMAP folders to fix locale-specific sent folder name"
```

---

## Self-Review Checklist

- [x] **Root cause addressed**: `sync-account.ts` no longer crashes when sent folder is missing — INBOX syncs regardless
- [x] **Spec coverage**: Gmail preset ✓, App Password guide with link ✓, folder discovery ✓, generic IMAP still works ✓
- [x] **Placeholder scan**: All steps have complete code — no TBDs
- [x] **Type consistency**: `provider: "gmail" | "generic"`, `folders: string[]`, `listImapFolders` return type matches server action signature
- [x] **No new npm deps**: `imap` already installed; shadcn `Alert` and `select` element used (no new shadcn install needed)
- [x] **Task ordering correct**: Task 1 (backend fix) can be done independently; Tasks 3–4 build on each other in the same file
