# Documents Guide

## Overview

The Documents module in NextCRM provides a centralized, secure repository for all your business files. Store contracts, proposals, presentations, invoices, and any other files your team needs access to. With powerful search, version control, and granular sharing options, the Documents module ensures your team can find and collaborate on files efficiently while maintaining security and compliance.

### Why Use Documents in NextCRM?

**Centralized Storage**: Keep all business documents in one place instead of scattered across email attachments, personal drives, and cloud storage services.

**Automatic Organization**: Link documents directly to accounts, contacts, leads, opportunities, and projects. No more searching through folders to find that contract associated with a specific client.

**Secure Sharing**: Share documents with team members or external stakeholders with precise control over who can view, download, or edit. Set expiration dates and revoke access at any time.

**Version Control**: Every time you upload a new version of a document, NextCRM automatically preserves the previous versions. Never lose track of document history or worry about overwriting important files.

**Full-Text Search**: Find documents instantly by searching within file names, descriptions, tags, and even the content of PDF and Office documents.

### Key Benefits

- **Compliance**: Built-in audit logs track every access, download, and modification. Essential for GDPR, SOC 2, and other compliance requirements.
- **Collaboration**: Multiple team members can access, comment on, and work with documents simultaneously.
- **Security**: Enterprise-grade encryption both in transit (TLS 1.3) and at rest (AES-256). Granular access controls ensure sensitive documents remain private.
- **Integration**: Documents automatically link to CRM records, projects, and invoices, providing context and reducing duplicate storage.
- **Accessibility**: Access documents from anywhere with an internet connection. No VPN or special software required.

---

## Uploading & Managing Documents

### Single File Upload

**Basic Upload Process:**

1. Navigate to **Documents** in the main navigation
2. Click the **Upload Document** button (top right)
3. Click **Choose File** or drag and drop a file into the upload area
4. Fill in document details:
   - **File Name**: Automatically populated, but you can rename
   - **Description**: Optional but recommended for searchability
   - **Tags**: Add comma-separated tags (e.g., "contract, legal, 2024")
   - **Link To**: Associate with Account, Contact, Lead, Opportunity, or Project
   - **Access Level**: Private (only you), Team (your team), or Organization (all users)
5. Click **Upload**

The document will appear in your document list within seconds. Large files (over 50MB) may take longer to process.

**Pro Tip**: Always add a meaningful description. Generic file names like "Document1.pdf" become impossible to find later. Use descriptions like "Q1 2024 Marketing Proposal for Acme Corp."

### Drag & Drop Upload

The fastest way to upload documents:

1. Open the Documents page
2. Drag files directly from your desktop or file explorer into the document list area
3. Files will automatically begin uploading
4. A progress indicator shows upload status
5. Once uploaded, click on the document to add description, tags, and associations

You can drag multiple files simultaneously. NextCRM will queue them and upload them sequentially.

### Bulk Upload

For uploading multiple documents at once:

1. Click **Upload Document** → **Bulk Upload**
2. Select multiple files (hold Ctrl/Cmd to select multiple)
3. All files will be added to the upload queue
4. Set default properties for all files:
   - **Default Access Level**: Apply to all files
   - **Default Tags**: Apply to all files
   - **Link To**: Apply to all files (optional)
5. Click **Upload All**
6. After upload completes, you can edit individual documents to customize properties

**Maximum Files**: 20 files per bulk upload operation.

### Supported File Types

NextCRM supports all common file types:

**Documents:**
- PDF (.pdf) - Full preview and full-text search
- Microsoft Word (.doc, .docx) - Full preview
- Microsoft Excel (.xls, .xlsx) - Full preview
- Microsoft PowerPoint (.ppt, .pptx) - Full preview
- Text files (.txt, .md, .csv) - Full preview
- Rich Text Format (.rtf)

**Images:**
- JPEG (.jpg, .jpeg) - Thumbnail and full preview
- PNG (.png) - Thumbnail and full preview
- GIF (.gif) - Thumbnail and full preview
- BMP (.bmp)
- SVG (.svg)
- WebP (.webp)

**Archives:**
- ZIP (.zip)
- RAR (.rar)
- TAR (.tar, .tar.gz)

**Other:**
- Audio files (.mp3, .wav, .ogg)
- Video files (.mp4, .mov, .avi)
- CAD files (.dwg, .dxf)

**Unsupported Files**: Executable files (.exe, .app, .dmg) are blocked for security reasons.

### File Size Limits

**Per File Limits:**
- Free Plan: 10 MB per file
- Starter Plan: 25 MB per file
- Professional Plan: 100 MB per file
- Enterprise Plan: 500 MB per file

**Total Storage:**
- Free Plan: 2 GB total
- Starter Plan: 25 GB total
- Professional Plan: 100 GB total
- Enterprise Plan: 1 TB total (expandable)

If you need to upload larger files, consider compressing them first or contact support for custom limits.

### Organizing Into Folders

Create a logical folder structure to keep documents organized:

1. Click **New Folder** in the Documents page
2. Name your folder (e.g., "Contracts", "Marketing Materials", "Legal")
3. Set folder access level (inherited by all documents unless overridden)
4. Move documents into folders by:
   - Dragging documents onto folder names
   - Using the **Move To** option in document menu
   - Selecting multiple documents and using **Bulk Move**

**Folder Structure Best Practices:**

```
Documents/
├── Contracts/
│   ├── Active/
│   ├── Expired/
│   └── Templates/
├── Marketing/
│   ├── Brochures/
│   ├── Case Studies/
│   └── Presentations/
├── Legal/
│   ├── NDAs/
│   ├── Terms of Service/
│   └── Privacy Policies/
├── Financial/
│   ├── Invoices/
│   ├── Receipts/
│   └── Tax Documents/
├── HR/
│   ├── Policies/
│   ├── Employee Docs/
│   └── Benefits/
└── Projects/
    └── [Project Name]/
        ├── Proposals/
        ├── Deliverables/
        └── Change Orders/
```

**Folder Depth Limit**: 5 levels deep to maintain performance and usability.

**Pro Tip**: Don't over-organize. Use tags and search instead of creating dozens of nested folders. A simple 2-3 level folder structure with good tagging is more maintainable.

### Moving and Renaming

**To Rename a Document:**
1. Click on the document to open details
2. Click the **Edit** icon next to the file name
3. Enter new name
4. Click **Save**

**To Move Documents:**
1. Select one or more documents (checkbox on left)
2. Click **Actions** → **Move To**
3. Select destination folder
4. Click **Move**

**To Copy Documents:**
1. Select document(s)
2. Click **Actions** → **Copy To**
3. Select destination folder
4. Click **Copy**

Copying creates a duplicate file with a new version history. Useful when you need to customize a template for different clients.

---

## Searching & Finding Documents

### Quick Search

The search bar at the top of the Documents page provides instant results:

1. Type any keyword into the search box
2. Results appear as you type (live search)
3. Search covers:
   - File names
   - Descriptions
   - Tags
   - File content (for PDF, Word, Excel, text files)
   - Creator name
   - Associated record names (Account, Contact, etc.)

**Example Searches:**
- "acme contract" - Finds all documents related to Acme Corp contracts
- "Q1 2024" - Finds all documents from Q1 2024
- "proposal approved" - Finds proposals with "approved" in content or description

### Advanced Filtering

Use filters to narrow down results:

**Filter by Type:**
- All Types
- Documents (PDF, Word, Excel, PowerPoint)
- Images (JPEG, PNG, GIF)
- Archives (ZIP, RAR)
- Other

**Filter by Date:**
- Today
- Last 7 days
- Last 30 days
- Last 90 days
- This year
- Custom date range

**Filter by Owner:**
- My Documents
- Shared with me
- Specific team member (dropdown)
- All documents (if you have permission)

**Filter by Tags:**
- Select one or more tags from the tag cloud
- Documents matching ANY selected tag are shown
- Use "Match all tags" option to require all tags

**Filter by Association:**
- Account: Select account from dropdown
- Contact: Select contact from dropdown
- Lead: Select lead from dropdown
- Opportunity: Select opportunity from dropdown
- Project: Select project from dropdown
- No association: Documents not linked to any record

**Combining Filters:**

Filters work together to narrow results. For example:
- Type: Documents
- Date: Last 30 days
- Owner: John Smith
- Tags: contract, legal

This would show only document files uploaded by John Smith in the last 30 days with both "contract" and "legal" tags.

### Advanced Search Operators

For power users, NextCRM supports search operators:

**Exact Phrase:**
```
"marketing proposal"
```
Finds exact phrase, not just documents containing both words.

**Exclude Words:**
```
contract -expired
```
Finds documents with "contract" but not "expired".

**OR Search:**
```
proposal OR quote
```
Finds documents with either word.

**Field-Specific Search:**
```
tag:legal
owner:john.smith@company.com
type:pdf
```

**Date Range Search:**
```
date:2024-01-01..2024-03-31
```
Finds documents uploaded between those dates.

**Size Search:**
```
size:>5MB
size:<100KB
```

**Pro Tip**: Combine operators for powerful searches: `"service agreement" tag:legal date:2024-01-01..2024-12-31 -expired`

### Saved Searches

Save frequently used searches:

1. Perform a search with your desired filters
2. Click **Save Search** (bookmark icon)
3. Name your saved search (e.g., "Active Legal Contracts")
4. Saved search appears in the sidebar under **Saved Searches**
5. Click to instantly rerun the search

**Common Saved Searches:**
- "My Recent Documents" - Your uploads from last 30 days
- "Pending Approval" - Documents tagged with "pending-approval"
- "Expiring Contracts" - Contracts expiring within 60 days
- "Shared with Me" - Documents others have shared with you

You can create up to 10 saved searches (Professional Plan) or 25 (Enterprise Plan).

---

## Sharing & Access Control

### Sharing with Team Members

Share documents securely with team members:

1. Open the document details page
2. Click **Share** button
3. In the **Share with Team** section:
   - Search for team members by name or email
   - Select one or more team members
   - Set permission level for each:
     - **Viewer**: Can view and download only
     - **Downloader**: Can view, download, and share
     - **Editor**: Can view, download, edit, and re-upload versions
4. Add an optional message (appears in email notification)
5. Click **Share**

Team members receive an email notification with a direct link to the document.

**Removing Access:**
1. Open document details
2. Scroll to **Shared With** section
3. Click the **X** next to the team member's name
4. Confirm removal

Access is revoked immediately.

### Public Sharing Links

Create shareable links for external stakeholders:

1. Open document details
2. Click **Create Public Link**
3. Configure link settings:
   - **Link Name**: Internal reference (e.g., "Client Review Link")
   - **Expiration Date**: Set when link becomes invalid (1 day, 7 days, 30 days, custom, or never)
   - **Password Protection**: Require password to access (optional but recommended)
   - **Download Allowed**: Allow or prevent downloading
   - **View Limit**: Maximum number of times link can be accessed (optional)
4. Click **Create Link**
5. Copy the generated URL and share it via email, chat, or any other method

**Link Format:**
```
https://app.nextcrm.io/share/doc/a7f3b2c1d4e5f6g7h8i9j0k1
```

**Link Security Features:**

**Password Protection:**
When enabled, anyone accessing the link must enter the password you set. Share the password separately (e.g., via phone or SMS) for added security.

**Expiration:**
Links automatically become invalid after the expiration date. Recipients see a "Link Expired" message. You can extend expiration dates at any time before expiration.

**View-Only Mode:**
Disable downloads to allow viewing only. Useful for sensitive documents where you want to share information but not allow copies to leave your control.

**View Limit:**
Set a maximum number of views (e.g., 10 views). After the limit is reached, the link becomes invalid. Useful for limiting distribution.

**Tracking:**
Every time someone accesses a public link, NextCRM logs:
- Timestamp
- IP address
- Device type (desktop, mobile, tablet)
- Browser
- Whether they downloaded (if allowed)

View tracking data in the document's **Access Log** section.

### Revoking Public Links

Delete a public link to immediately revoke access:

1. Open document details
2. Scroll to **Public Links** section
3. Click **Delete** next to the link
4. Confirm deletion

The link becomes invalid instantly. Anyone trying to access it will see "Link Not Found."

**Pro Tip**: Instead of deleting, you can also disable a link temporarily by clicking **Disable**. Re-enable it later without generating a new URL.

### Access Levels

NextCRM uses a three-tier access level system:

**Viewer:**
- View document in browser
- Download document (if enabled)
- View document metadata (name, description, tags)
- View version history
- Cannot edit, delete, or share

**Downloader:**
- All Viewer permissions
- Download document (always enabled)
- Share document with others (creates new share links)
- Cannot edit or delete

**Editor:**
- All Downloader permissions
- Upload new versions
- Edit document metadata (name, description, tags)
- Move document to different folders
- Delete document (if they own it or are organization Admin/Owner)

**Setting Default Access:**

When uploading a document, set the default access level:
- **Private**: Only you can access (default)
- **Team**: Your immediate team members get Viewer access
- **Organization**: All users in your organization get Viewer access

You can always change access levels later or grant specific permissions to individuals.

### Share Tracking

Monitor who has accessed your documents:

1. Open document details
2. Click **Access Log** tab
3. View detailed access history:
   - **User**: Who accessed (team member or "Anonymous" for public links)
   - **Action**: Viewed, Downloaded, Edited, Shared
   - **Timestamp**: Exact date and time
   - **IP Address**: Source IP (useful for security auditing)
   - **Device**: Desktop, mobile, tablet
   - **Browser**: Chrome, Safari, Firefox, etc.

**Export Access Logs:**
Click **Export** to download a CSV file of all access events. Useful for compliance audits and security reviews.

**Access Alerts:**
Set up email alerts for sensitive documents:
1. Open document details
2. Click **Settings** → **Access Alerts**
3. Enable alerts for:
   - Any access (every view or download)
   - Downloads only
   - Shares only
   - Edits only
4. Click **Save**

You'll receive an email notification each time the triggering action occurs.

---

## Document Features

### In-Browser Preview

NextCRM provides rich preview capabilities without requiring downloads:

**PDF Preview:**
- Full PDF rendering in browser
- Page navigation (next/previous, jump to page)
- Zoom controls (25% to 400%)
- Full-screen mode
- Text selection and copy
- Search within PDF (Ctrl+F / Cmd+F)

**Image Preview:**
- High-resolution rendering
- Zoom and pan
- Rotate and flip
- Download in original or optimized format
- EXIF metadata display (for photos)

**Office Document Preview:**
- Word documents: Full formatting preserved
- Excel spreadsheets: All sheets accessible, cell formulas visible
- PowerPoint presentations: Slide navigation, presenter notes visible
- Page/slide thumbnails for quick navigation

**Text File Preview:**
- Syntax highlighting for code files (.js, .ts, .py, .java, etc.)
- Markdown rendering for .md files
- Line numbers
- Word wrap toggle
- Copy entire content with one click

**Video/Audio Preview:**
- Built-in media player
- Playback controls (play, pause, seek, volume)
- Playback speed adjustment (0.5x to 2x)
- Full-screen video mode

**Preview Limitations:**
- Extremely large files (>100MB) may have slower preview loading
- Some specialized file formats (CAD, EPS, AI) show file info but not visual preview
- Encrypted or password-protected files cannot be previewed (download required)

**Mobile Preview:**
NextCRM's responsive design ensures previews work on mobile devices. On smaller screens, preview mode adapts to provide optimal viewing experience.

### Version Control

Every document in NextCRM has automatic version control:

**How Version Control Works:**

1. Upload a document (Version 1)
2. Upload a file with the same name or click **Upload New Version** (Version 2 created)
3. Upload again (Version 3 created)
4. Repeat as needed

**Version Limit**: Up to 50 versions per document (configurable by administrator).

**Viewing Version History:**

1. Open document details
2. Click **Version History** tab
3. See list of all versions with:
   - Version number
   - Upload date and time
   - Uploader name
   - File size
   - Change notes (if provided)
   - Download link for that version

**Downloading Previous Versions:**

1. Open **Version History**
2. Find the version you need
3. Click **Download** next to that version
4. File downloads with version number appended to filename (e.g., "contract-v3.pdf")

**Restoring Previous Versions:**

1. Open **Version History**
2. Click **Restore** next to the version you want
3. Confirm restoration
4. The selected version becomes the current version (a new version number is created)

**Example:**
- You have Version 5 as current
- Restore Version 3
- Version 6 is created as a copy of Version 3
- Version 5 remains in history

**Comparing Versions:**

For text-based files (Word, text files), you can compare versions:

1. Open **Version History**
2. Select two versions (checkboxes)
3. Click **Compare**
4. View side-by-side diff with:
   - Added text (green highlight)
   - Removed text (red strikethrough)
   - Modified text (yellow highlight)

**Version Notes:**

When uploading a new version, add change notes:
1. Click **Upload New Version**
2. Select file
3. In **Version Notes** field, describe changes (e.g., "Updated pricing table, fixed typos on page 3")
4. Click **Upload**

These notes appear in version history and help team members understand what changed.

**Pro Tip**: Use version notes consistently. Future you (or your team) will thank you when trying to find "the version with the revised pricing."

### Comments and Annotations

Collaborate on documents without creating new versions:

**Adding Comments:**

1. Open document preview
2. Click **Comment** button (speech bubble icon)
3. Type your comment
4. Optionally:
   - @mention team members to notify them
   - Mark as important (red flag icon)
   - Attach screenshot or file
5. Click **Post**

Comments appear in chronological order in the sidebar.

**Annotation Types:**

**General Comments:**
- Apply to the entire document
- Appear at the top of the comment thread
- Use for overall feedback or questions

**Page/Location-Specific Comments (PDFs only):**
1. Click on a specific location in the PDF
2. A comment marker appears at that location
3. Type your comment
4. The marker remains visible on the page
5. Click the marker to view/reply to comments

**Replies:**
- Click **Reply** under any comment
- Create threaded conversations
- Notifications sent to original commenter and anyone @mentioned

**Resolving Comments:**
1. Click **Resolve** next to a comment
2. The comment is marked as resolved (gray background)
3. Resolved comments can be hidden/shown with toggle
4. Useful for tracking which feedback has been addressed

**Editing/Deleting Comments:**
- Edit your own comments within 15 minutes of posting
- Delete your own comments anytime
- Admins can delete any comments

**Comment Notifications:**
You receive email notifications when:
- Someone @mentions you in a comment
- Someone replies to your comment
- Someone comments on a document you own or shared
- You can disable notifications per document in **Settings**

**Comment Permissions:**
- Viewers: Can read comments but not add them
- Downloaders: Can read and add comments
- Editors: Can read, add, edit (their own), and delete (their own) comments
- Admins/Owners: Can delete any comments

---

## Document Organization

### Naming Conventions

Follow these best practices for naming documents:

**Good Names:**
- `2024-Q1-Marketing-Budget.xlsx`
- `Acme-Corp-Service-Agreement-2024-03-15.pdf`
- `Product-Brochure-v3.pdf`
- `Client-Interview-Notes-John-Smith.docx`

**Bad Names:**
- `Document1.pdf`
- `Untitled.docx`
- `final-FINAL-v2-actually-final.pdf`
- `scan001.pdf`

**Naming Rules:**

1. **Include Date**: Use ISO format (YYYY-MM-DD) at the beginning or end
2. **Be Descriptive**: Name should tell you what's inside without opening
3. **Use Hyphens or Underscores**: Not spaces (easier for systems and URLs)
4. **Include Version**: If not using version control, add version to name
5. **Keep It Short**: Under 100 characters (some systems have limits)
6. **Avoid Special Characters**: No `/ \ : * ? " < > |` (causes issues in file systems)

**Organizational Prefixes:**

Use consistent prefixes for different document types:
- `CONTRACT-` for all contracts
- `INVOICE-` for invoices
- `PROPOSAL-` for proposals
- `REPORT-` for reports
- `MEMO-` for internal memos

Example: `CONTRACT-Acme-Corp-2024-03-15.pdf`

### Tagging System

Tags provide flexible organization across folder boundaries:

**Creating Tags:**

When uploading or editing a document:
1. Click in the **Tags** field
2. Type a tag name
3. Press Enter or comma to create the tag
4. Add multiple tags (recommended: 3-5 tags per document)

**Tag Best Practices:**

**Use Consistent Tag Naming:**
- Decide on lowercase vs title case (recommend lowercase)
- Use hyphens for multi-word tags: `work-order`, `customer-facing`

**Create a Tag Taxonomy:**

Example tag structure:
```
Document Type Tags:
- contract
- proposal
- invoice
- report
- memo
- presentation

Status Tags:
- draft
- pending-approval
- approved
- expired
- active

Department Tags:
- sales
- marketing
- legal
- hr
- finance

Client Type Tags:
- enterprise
- smb
- startup
```

**Tag Management:**

View all tags:
1. Go to **Documents** → **Manage Tags**
2. See all tags used in your organization
3. View document count for each tag
4. Merge duplicate tags (e.g., merge "legal" and "Legal" into one)
5. Rename tags globally (all documents using the tag get updated)
6. Delete unused tags

**Tag Limits:**
- Maximum 20 tags per document
- Maximum 500 unique tags per organization (Enterprise plan has unlimited)

**Pro Tip**: Use tags for cross-cutting concerns that span folders. For example, tag all customer-facing documents with `customer-facing` regardless of which folder they're in. Then create a saved search for `tag:customer-facing` to see them all at once.

### Archiving Old Documents

Archive documents you no longer actively use but must retain:

**Archive vs Delete:**
- **Archive**: Document remains in system but hidden from normal views. Searchable with filter. Useful for compliance.
- **Delete**: Document permanently removed (after 30-day grace period). Not searchable.

**To Archive Documents:**

1. Select one or more documents
2. Click **Actions** → **Archive**
3. Add optional reason for archiving
4. Click **Archive**

Archived documents:
- Don't appear in default document lists
- Don't count against active document limits (some plans)
- Remain searchable with **Include Archived** filter enabled
- Retain all version history and access logs
- Can be unarchived anytime

**To View Archived Documents:**

1. Go to Documents page
2. Enable **Include Archived** filter (checkbox at top)
3. Archived documents appear with gray "Archived" badge
4. Click **Unarchive** to restore to active status

**Auto-Archive Rules:**

Set up automatic archiving rules:
1. Go to **Documents** → **Settings** → **Auto-Archive**
2. Create rule:
   - **Condition**: Last accessed more than X days ago (e.g., 365 days)
   - **Action**: Archive automatically
   - **Apply to**: All documents, or specific folders/tags
3. Enable rule
4. System checks daily and archives matching documents

You receive a weekly email summary of auto-archived documents.

**Pro Tip**: Archive aggressively. It keeps your active document list manageable while retaining everything for compliance. You can always search archived documents when needed.

### Storage Quota Management

Monitor and manage your storage usage:

**Viewing Usage:**

1. Go to **Documents** → **Storage**
2. View:
   - Total storage used (GB)
   - Total storage available (GB)
   - Percentage used (visual meter)
   - Breakdown by file type (pie chart)
   - Largest documents (top 20)

**Storage Alerts:**

You receive email alerts at:
- 75% storage used
- 90% storage used
- 100% storage used (uploads disabled until you free space)

**Freeing Storage:**

**Delete Unnecessary Documents:**
1. Review documents not accessed in 365+ days
2. Identify duplicates (use **Find Duplicates** tool)
3. Delete or archive old versions

**Delete Old Versions:**
1. Go to **Documents** → **Settings** → **Version Retention**
2. Set rule: Keep only last X versions (e.g., 10 versions)
3. Apply to all documents or specific folders
4. Older versions permanently deleted

**Compress Large Files:**
Before uploading:
- Compress PDFs using Adobe Acrobat or online tools
- Resize images to reasonable dimensions (usually 1920px is sufficient)
- Convert Office documents to PDF (often smaller)

**Upgrade Plan:**
If you consistently need more storage, consider upgrading to a higher plan:
- Starter: 25 GB
- Professional: 100 GB
- Enterprise: 1 TB (expandable to 10 TB)

---

## Security & Compliance

### Encryption

All documents in NextCRM are encrypted:

**In Transit:**
- TLS 1.3 encryption for all uploads and downloads
- Perfect forward secrecy
- HTTPS enforced (HTTP automatically redirects)

**At Rest:**
- AES-256 encryption for all stored files
- Separate encryption keys per organization
- Keys rotated automatically every 90 days
- Keys stored in separate key management service (AWS KMS)

**End-to-End Encryption (Enterprise Plan):**
Optionally enable client-side encryption:
- Files encrypted on your device before upload
- NextCRM never has access to decryption keys
- Only you and users you explicitly share with can decrypt
- Slightly slower upload/download performance

### Audit Logs

Every document action is logged:

**Viewing Audit Logs:**

1. Go to **Documents** → **Audit Logs**
2. View all events:
   - **Event**: Upload, Download, View, Edit, Delete, Share, Archive
   - **User**: Who performed the action
   - **Document**: Which document
   - **Timestamp**: Exact date and time (UTC)
   - **IP Address**: Source IP
   - **Device**: Desktop, mobile, tablet
   - **Result**: Success or failure

**Filtering Audit Logs:**
- By user (see all actions by specific team member)
- By document (see all actions on specific document)
- By event type (see all downloads)
- By date range
- By IP address (identify suspicious access patterns)

**Exporting Audit Logs:**
Click **Export** to download CSV of filtered logs. Required for many compliance audits.

**Retention:**
- Starter Plan: 90 days
- Professional Plan: 1 year
- Enterprise Plan: 7 years (configurable)

### GDPR Compliance

NextCRM provides tools for GDPR compliance:

**Right to Access:**
Users can request their data:
1. User goes to **Profile** → **Privacy** → **Request My Data**
2. NextCRM generates a ZIP file containing:
   - All documents uploaded by the user
   - All documents shared with the user
   - All comments made by the user
   - All audit log entries involving the user
3. User receives download link via email within 48 hours

**Right to Deletion:**
Users can request deletion:
1. User goes to **Profile** → **Privacy** → **Request Deletion**
2. Administrator receives deletion request
3. Administrator approves (after verifying no legal hold requirements)
4. User's documents are:
   - Transferred to a designated user (if specified)
   - OR marked for deletion
5. After 30-day grace period, documents permanently deleted

**Data Processing Agreement:**
Enterprise customers receive a signed DPA covering document storage and processing.

### Retention Policies

Define how long documents are kept:

**Setting Retention Policies:**

1. Go to **Documents** → **Settings** → **Retention Policies**
2. Create policy:
   - **Name**: E.g., "Contract Retention"
   - **Applies To**: Folder, tag, or document type
   - **Retain For**: 1 year, 3 years, 7 years, 10 years, indefinitely
   - **After Retention Period**: Delete permanently, archive, or request review
3. Save policy

**Legal Hold:**
Prevent deletion of documents under legal investigation:
1. Open document details
2. Click **Settings** → **Legal Hold**
3. Enable legal hold
4. Document cannot be deleted by anyone (including admins) until legal hold is removed
5. Audit log entry created

**Common Retention Periods:**
- Contracts: 7 years after expiration
- Tax documents: 7 years
- Employee records: 7 years after separation
- Marketing materials: 3 years
- Meeting notes: 1 year

Consult with legal counsel to determine appropriate retention periods for your industry and jurisdiction.

---

**Need Help?** Contact support at support@nextcrm.io or see the [Troubleshooting Guide](TROUBLESHOOTING.md) for common issues.

**Related Guides:**
- [CRM Guide](CRM-GUIDE.md) - Link documents to accounts and contacts
- [Projects Guide](PROJECTS-GUIDE.md) - Attach documents to projects
- [Admin Guide](ADMIN-GUIDE.md) - Configure document settings and storage limits
