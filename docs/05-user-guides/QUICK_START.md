# NextCRM Quick Start Reference

**Quick reference guide for common tasks, keyboard shortcuts, and troubleshooting.**

Print this guide or bookmark it for fast access to essential NextCRM operations.

---

## Keyboard Shortcuts

### Global Shortcuts

| Action | Windows/Linux | Mac | Description |
|--------|---------------|-----|-------------|
| **Global Search** | `Ctrl + K` | `Cmd + K` | Search across all records |
| **Settings** | `Ctrl + ,` | `Cmd + ,` | Open settings |
| **Help** | `F1` | `F1` | Open help documentation |
| **New Account** | `Ctrl + Shift + A` | `Cmd + Shift + A` | Create new account |
| **New Lead** | `Ctrl + Shift + L` | `Cmd + Shift + L` | Create new lead |
| **New Task** | `Ctrl + Shift + T` | `Cmd + Shift + T` | Create new task |
| **New Opportunity** | `Ctrl + Shift + O` | `Cmd + Shift + O` | Create new opportunity |

### Navigation

| Action | Shortcut | Description |
|--------|----------|-------------|
| **Dashboard** | `G` then `D` | Go to dashboard |
| **Accounts** | `G` then `A` | Go to accounts list |
| **Leads** | `G` then `L` | Go to leads list |
| **Projects** | `G` then `P` | Go to projects |
| **Invoices** | `G` then `I` | Go to invoices |

### Data Tables

| Action | Shortcut | Description |
|--------|----------|-------------|
| **Next page** | `→` or `N` | Navigate to next page |
| **Previous page** | `←` or `P` | Navigate to previous page |
| **Select row** | `Space` | Select/deselect current row |
| **Edit row** | `E` | Edit selected row |
| **Delete row** | `Del` | Delete selected row (with confirmation) |

---

## Common Workflows (2-3 Steps)

### CRM Operations

**Create a New Account**
1. Navigate to CRM → Accounts
2. Click "New Account" button (or `Ctrl+Shift+A`)
3. Fill required fields (Name) → Save

**Convert a Lead to Opportunity**
1. Open lead detail page
2. Click "Convert to Opportunity"
3. Fill opportunity details → Save

**Add Contact to Account**
1. Open account detail page
2. Click "Add Contact" in Contacts section
3. Fill contact details → Save

**Move Opportunity to Next Stage**
1. Open opportunity detail page
2. Click current sales stage dropdown
3. Select new stage → Auto-saves

**Bulk Import Leads from CSV**
1. CRM → Leads → "Import" button
2. Upload CSV file (must match template)
3. Map columns → Import

### Project Management

**Create New Project Board**
1. Projects → "New Project" button
2. Enter title and description → Save
3. Add sections (columns) for your workflow

**Add Task to Project**
1. Open project board
2. Click "+" in desired section
3. Enter task title → Press Enter

**Assign Task to Team Member**
1. Click task card
2. Click "Assignee" field
3. Select user from dropdown

**Move Task Between Sections**
1. Drag task card
2. Drop in target section
3. Auto-saves position

### Invoicing

**Upload Invoice Document**
1. Invoices → "Upload PDF" button
2. Drag and drop PDF file
3. AI extracts data automatically → Review and save

**Track Payment Status**
1. Open invoice detail page
2. Update "Status" dropdown (Draft → Sent → Paid)
3. Auto-saves

**View Overdue Invoices**
1. Invoices page → Click "Filter" button
2. Select "Status: Overdue"
3. View filtered list

### Documents

**Upload File**
1. Documents → "Upload" button (by file type)
2. Select file from computer
3. Add description (optional) → Upload

**Share Document with Team**
1. Open document detail page
2. Click "Share" button
3. Select users or generate public link

---

## Search Syntax

### Basic Search

Type in search bar (Ctrl+K / Cmd+K):

```
Acme Corp          → Searches all fields for "Acme Corp"
john@example.com   → Finds contacts/accounts with this email
```

### Advanced Search Filters

Use prefixes to search specific types:

```
account: Acme      → Searches only accounts
contact: John      → Searches only contacts
lead: Jane         → Searches only leads
opportunity: Q4    → Searches only opportunities
task: Website      → Searches only tasks
invoice: 2024      → Searches only invoices
```

### Combining Filters

```
account:Acme status:Active
contact:Smith assigned:me
task:Bug priority:High
```

---

## Common 2-Minute Tasks

### Update Your Profile Photo
1. Click avatar (top-right) → Profile
2. Click photo → Upload → Select image → Save

### Change Language
1. Click avatar → Profile
2. Language dropdown → Select language → Auto-saves

### Invite a Teammate
1. Settings → Team → "Invite Member"
2. Enter email, select role → Send

### Reset Your Password
1. Sign-in page → "Forgot password?"
2. Enter email → Check email → Click link → Set new password

### Export Your Data
1. Settings → Organization → "Export Data"
2. Click "Request Export" → Check email for download link

### Add Watcher to Record
1. Open record (account, opportunity, project)
2. Click "Watchers" section → "Add Watcher"
3. Select user → Save

### Create Task Comment
1. Open task detail
2. Scroll to Comments section
3. Type comment → Press Ctrl+Enter or click "Send"

### Filter Data Table
1. Click "Filter" icon/button in table toolbar
2. Select filter criteria (status, assigned user, date range)
3. Table updates automatically

### Sort Data Table
1. Click column header to sort ascending
2. Click again to sort descending
3. Click third time to remove sort

---

## Getting Help Quickly

### In-App Help

**? Icons**
- Hover or click question mark icons throughout the interface
- Provides contextual help for the current page

**Help Menu**
- Click "Help" in sidebar
- Access documentation, tutorials, support

### Troubleshooting Checklist

**Issue:** Page won't load or is stuck
- [ ] Refresh browser (F5 or Ctrl+R)
- [ ] Clear browser cache (Ctrl+Shift+Delete)
- [ ] Try incognito/private mode
- [ ] Check internet connection
- [ ] Try different browser

**Issue:** Can't find a record
- [ ] Check filters (may be hiding record)
- [ ] Check current organization (may be in different org)
- [ ] Search using global search (Ctrl+K)
- [ ] Verify you have permission to view record

**Issue:** Can't edit a record
- [ ] Check your user role (Viewer role is read-only)
- [ ] Verify record isn't locked or archived
- [ ] Check if record is assigned to someone else (may need permission)

**Issue:** Upload failed
- [ ] Check file size (max varies by plan)
- [ ] Check file type (must be supported format)
- [ ] Check remaining storage quota
- [ ] Try smaller file or different format

**Issue:** Email not received
- [ ] Check spam/junk folder
- [ ] Wait 5-10 minutes (email delay)
- [ ] Verify correct email address in profile
- [ ] Contact support if still missing

### Quick Links to Support

- **FAQ:** [FAQ.md](./FAQ.md)
- **Troubleshooting:** [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- **Email Support:** support@nextcrm.io
- **System Status:** [status.nextcrm.io](#)

---

## Quick Reference Tables

### User Roles & Capabilities

| Action | Owner | Admin | Member | Viewer |
|--------|-------|-------|--------|--------|
| View records | ✅ | ✅ | ✅ | ✅ |
| Create records | ✅ | ✅ | ✅ | ❌ |
| Edit own records | ✅ | ✅ | ✅ | ❌ |
| Edit all records | ✅ | ✅ | Assigned only | ❌ |
| Delete records | ✅ | ✅ | Own only | ❌ |
| Invite users | ✅ | ✅ | ❌ | ❌ |
| Manage users | ✅ | ✅ | ❌ | ❌ |
| View audit logs | ✅ | ✅ | ❌ | ❌ |
| Export data | ✅ | ✅ | ❌ | ❌ |
| Billing | ✅ | ❌ | ❌ | ❌ |
| Delete org | ✅ | ❌ | ❌ | ❌ |

### CRM Lead Status Workflow

```
NEW → CONTACTED → QUALIFIED → (Convert to Opportunity)
                           ↘ LOST (if not qualified)
```

### CRM Opportunity Sales Stages

```
Prospecting → Qualification → Proposal → Negotiation → Closed Won
                                                      ↘ Closed Lost
```

### Invoice Status Workflow

```
Draft → Sent → Paid
            ↘ Overdue (if past due date)
```

### Task Status Workflow

```
ACTIVE → IN PROGRESS → COMPLETE
       ↘ PENDING (blocked/waiting)
```

### Project Task Priorities

| Priority | Use For | Icon |
|----------|---------|------|
| **High** | Urgent, critical tasks | 🔴 |
| **Medium** | Standard tasks | 🟡 |
| **Low** | Nice-to-have, backlog | 🟢 |

---

## Data Import Quick Reference

### CSV Import Format

**Accounts CSV:**
```csv
name,email,phone,website,industry,status
Acme Corp,contact@acme.com,555-1234,acme.com,Technology,Active
```

**Contacts CSV:**
```csv
first_name,last_name,email,phone,company,position
John,Smith,john@acme.com,555-5678,Acme Corp,CEO
```

**Leads CSV:**
```csv
first_name,last_name,email,phone,company,status
Jane,Doe,jane@startup.com,555-9999,Startup Inc,NEW
```

### Import Steps

1. Export sample data for format reference (if available)
2. Prepare your CSV file matching the format
3. Navigate to the list page (Accounts, Contacts, or Leads)
4. Click "Import" button
5. Upload CSV file
6. Map columns (drag and drop)
7. Preview and validate
8. Click "Import" → Wait for completion
9. Review imported records

---

## File Type Support

### Supported Upload Formats

**Documents Module:**
- **PDF:** .pdf
- **Images:** .jpg, .jpeg, .png, .gif, .bmp, .webp
- **Office:** .doc, .docx, .xls, .xlsx, .ppt, .pptx
- **Text:** .txt, .csv, .md
- **Archives:** .zip (if enabled)

**Invoices Module (AI Extraction):**
- **PDF only:** .pdf (for Rossum AI extraction)

**Profile Photos:**
- **Images:** .jpg, .jpeg, .png, .gif (max 5MB)

### File Size Limits

| Plan | Max File Size | Total Storage |
|------|---------------|---------------|
| FREE | 10MB | 1GB |
| PRO | 50MB | 10GB |
| ENTERPRISE | 100MB | Unlimited |

---

## Contact Support

### Before Contacting Support

1. ✅ Check [FAQ](./FAQ.md)
2. ✅ Try [Troubleshooting Guide](./TROUBLESHOOTING.md)
3. ✅ Search documentation
4. ✅ Refresh browser and retry

### What to Include

- **Description:** Clear explanation
- **Steps to reproduce:** 1, 2, 3...
- **Expected:** What should happen
- **Actual:** What actually happened
- **Browser:** Chrome 120, Firefox 121, etc.
- **Screenshot:** If visual issue
- **User email:** For account lookup

### Support Channels

**Email:** support@nextcrm.io
- Response time: 24-48 hours (FREE), 4-8 hours (PRO+)

**Emergency:** (ENTERPRISE only)
- Phone support for critical issues

---

## Printable Cheat Sheet

```
╔════════════════════════════════════════════════════════════╗
║              NEXTCRM QUICK REFERENCE CARD                  ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  KEYBOARD SHORTCUTS                                        ║
║  ────────────────────────────────────────────────────      ║
║  Global Search:        Ctrl/Cmd + K                        ║
║  Settings:             Ctrl/Cmd + ,                        ║
║  New Account:          Ctrl/Cmd + Shift + A                ║
║  New Task:             Ctrl/Cmd + Shift + T                ║
║                                                            ║
║  COMMON TASKS                                              ║
║  ────────────────────────────────────────────────────      ║
║  Create Account:       CRM → Accounts → New                ║
║  Create Project:       Projects → New Project              ║
║  Upload Invoice:       Invoices → Upload PDF               ║
║  Invite User:          Settings → Team → Invite            ║
║                                                            ║
║  SEARCH SYNTAX                                             ║
║  ────────────────────────────────────────────────────      ║
║  account:Acme          Search only accounts                ║
║  contact:John          Search only contacts                ║
║  assigned:me           Search assigned to me               ║
║                                                            ║
║  SUPPORT                                                   ║
║  ────────────────────────────────────────────────────      ║
║  Email:   support@nextcrm.io                               ║
║  Docs:    /docs/user-guides                                ║
║  Status:  status.nextcrm.io                                ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
```

---

**Need more details?** Explore the comprehensive guides:
- [Getting Started](./GETTING_STARTED.md)
- [CRM Guide](./CRM-GUIDE.md)
- [Projects Guide](./PROJECTS-GUIDE.md)
- [All Guides](./README.md)
