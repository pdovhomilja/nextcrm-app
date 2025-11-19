# Admin Guide

## Admin Overview

As a NextCRM Administrator, you're responsible for configuring and maintaining your organization's CRM system. This guide covers all administrative functions, from user management and permissions to billing and compliance. Whether you're setting up a new NextCRM instance or managing an established system, you'll find everything you need here.

### Admin Responsibilities

**Core Duties:**
- Manage user accounts (invitations, activations, role assignments)
- Configure organization settings (branding, locale, timezone)
- Control module access and feature availability
- Monitor system usage and activity
- Ensure compliance with data protection regulations
- Handle billing and subscription management
- Provide first-level support to team members

**Who Can Be an Admin:**
- Organization Owner (full admin access including billing)
- Users with Admin role (full access except billing)
- Users with Module Admin role (limited to specific modules)

### Accessing Admin Panel

**Location:**
1. Log into NextCRM
2. Click your profile picture (top right)
3. Select **Admin Panel** from dropdown
4. Or navigate directly to: **Settings** → **Administration**

**Admin Panel Sections:**
- Organization Settings
- User Management
- Roles & Permissions
- Module Management
- Audit & Compliance
- Billing & Subscription
- Support & Resources

### Common Administrative Tasks

**Daily Tasks:**
- Review and approve new user registrations (if approval workflow enabled)
- Monitor system alerts and notifications
- Respond to user access requests

**Weekly Tasks:**
- Review audit logs for suspicious activity
- Check storage usage and quota
- Review user activity reports

**Monthly Tasks:**
- Review and update user permissions
- Archive inactive users
- Review billing and usage statistics
- Plan for feature rollouts or system updates

**Quarterly Tasks:**
- Conduct comprehensive security audit
- Review and update retention policies
- Assess module utilization and optimize licenses
- Plan for capacity expansion if needed

---

## Organization Settings

### Company Information

Configure your organization's core details:

**Accessing Company Settings:**
1. Go to **Admin Panel** → **Organization Settings**
2. Select **Company Info** tab

**Required Fields:**

**Organization Name:**
- Your official company name
- Appears in page titles, email headers, invoices
- Example: "Acme Corporation"

**Display Name (Optional):**
- Shortened version for UI elements
- If blank, uses Organization Name
- Example: "Acme" instead of "Acme Corporation"

**Legal Name (Optional):**
- Official registered business name (if different from Organization Name)
- Appears on legal documents and invoices
- Example: "Acme Corporation Ltd."

**Website:**
- Company website URL
- Used for email signatures and customer communications
- Example: https://www.acmecorp.com

**Industry:**
- Select from dropdown (Software, Manufacturing, Healthcare, etc.)
- Used for benchmarking and recommendations
- If not listed, select "Other" and specify

**Company Size:**
- Select employee count range (1-10, 11-50, 51-200, 201-500, 501-1000, 1000+)
- Used for feature recommendations and support prioritization

**Tax ID / VAT Number:**
- Your business tax identification number
- Appears on invoices
- Used for tax calculations (if applicable)

**Company Logo:**
- Upload PNG, JPG, or SVG (max 2MB)
- Recommended size: 400x400px
- Appears in:
  - Top left of application (small version)
  - Customer-facing emails
  - PDF exports (invoices, proposals)
  - Public sharing pages

**Uploading Logo:**
1. Click **Upload Logo**
2. Select file from computer
3. Crop/resize if needed (built-in editor)
4. Click **Save**

**Company Address:**
- Full mailing address
- Appears on invoices and legal documents
- Fields:
  - Address Line 1 (required)
  - Address Line 2 (optional)
  - City (required)
  - State/Province (required)
  - Postal Code (required)
  - Country (required - dropdown)

**Contact Information:**
- Main phone number
- Support email address
- General email address
- Used for system-generated notifications and customer communications

**Social Media Links (Optional):**
- LinkedIn company page
- Twitter/X handle
- Facebook page
- Used in email signatures and public profiles

**Saving Changes:**
- Click **Save Changes** at bottom of page
- Changes take effect immediately
- Users see updated information on next page refresh

### Timezone & Localization

Configure how dates, times, and numbers display:

**Accessing Localization Settings:**
1. Go to **Admin Panel** → **Organization Settings**
2. Select **Localization** tab

**Timezone:**
- Select your organization's primary timezone
- Dropdown with all IANA timezones (e.g., "America/New_York", "Europe/London")
- Affects:
  - Timestamps in activity logs
  - Scheduled reports
  - Email send times
  - Meeting times
  - Reminder notifications

**Pro Tip**: Use the timezone where most of your team is located. Remote team members can set individual timezones in their user preferences, but this is the default.

**Date Format:**
- Choose how dates display
- Options:
  - MM/DD/YYYY (US format) - 03/15/2024
  - DD/MM/YYYY (European format) - 15/03/2024
  - YYYY-MM-DD (ISO format) - 2024-03-15
- Applies to all date fields system-wide

**Time Format:**
- 12-hour (8:30 PM)
- 24-hour (20:30)

**Number Format:**
- Decimal separator: period (.) or comma (,)
- Thousands separator: comma (,), period (.), or space ( )
- Examples:
  - US: 1,234.56
  - European: 1.234,56
  - International: 1 234.56

**Currency:**
- Select default currency (USD, EUR, GBP, CAD, AUD, etc.)
- Used for opportunity amounts, invoices, reports
- Multi-currency support available (Enterprise plan)

**Currency Format:**
- Symbol position: Before ($100) or After (100$)
- Decimal places: 0, 2, or 3

**Language:**
- Default interface language
- Options: English, German, Czech, Ukrainian
- Users can override in personal preferences

**First Day of Week:**
- Sunday or Monday
- Affects calendar views and date pickers

**Fiscal Year Start:**
- Month when your fiscal year begins
- Default: January
- Affects financial reports and year-over-year comparisons

**Saving Changes:**
- Click **Save Changes**
- Changes apply immediately to new data
- Existing data formats don't change (display only)

### Branding & Customization

Customize NextCRM's appearance:

**Accessing Branding Settings:**
1. Go to **Admin Panel** → **Organization Settings**
2. Select **Branding** tab

**Primary Color:**
- Main brand color
- Used for:
  - Action buttons
  - Links
  - Navigation highlights
  - Progress indicators
- Click color picker and select your brand color
- Or enter hex code (e.g., #1E40AF)

**Secondary Color:**
- Complementary color
- Used for secondary actions and accents

**Logo Settings:**
- See "Company Logo" in Company Information section
- Additional option: **Logo Link URL** (clicking logo goes to custom URL)

**Favicon:**
- Small icon in browser tab
- Upload 32x32px or 64x64px PNG or ICO file
- Recommended: transparent background

**Custom Domain (Enterprise):**
- Use your own domain instead of app.nextcrm.io
- Example: crm.yourcompany.com
- Requires DNS configuration (instructions provided)

**Email Branding:**
- Customize system-generated emails
- Header color
- Footer text
- Footer logo
- Social media links in footer

**Login Page Customization (Enterprise):**
- Custom background image
- Custom welcome message
- Hide/show specific login methods

**Custom CSS (Enterprise):**
- Advanced customization with custom CSS
- Override default styles
- Use with caution (may break with updates)

**Pro Tip**: Keep branding subtle. Heavy customization can confuse users who are familiar with standard NextCRM interface. Stick to logo and colors for most cases.

---

## User Management

### Viewing Users

See all users in your organization:

**Accessing User Management:**
1. Go to **Admin Panel** → **User Management**
2. View user list with columns:
   - Name
   - Email
   - Role (Owner, Admin, Member, Viewer)
   - Status (Active, Pending, Inactive, Suspended)
   - Last Active (timestamp)
   - Created Date
3. Sort by any column (click header)
4. Filter:
   - By role (dropdown)
   - By status (dropdown)
   - By team (dropdown)
   - Search by name or email

**User Details:**

Click any user to view:
- Full profile information
- Role and permissions
- Team memberships
- Activity summary (last login, actions in past 30 days)
- Owned records (accounts, leads, opportunities)
- Storage usage
- License consumption

### Inviting Users

Add new team members:

**Invitation Process:**

1. Go to **Admin Panel** → **User Management**
2. Click **Invite User** (top right)
3. Fill in invitation form:
   - **Email Address** (required) - Where invitation is sent
   - **First Name** (optional but recommended)
   - **Last Name** (optional but recommended)
   - **Role** (required) - Owner, Admin, Member, or Viewer (see Roles section)
   - **Team** (optional) - Assign to specific team
   - **Welcome Message** (optional) - Personalized message included in invitation email
4. Click **Send Invitation**

**Invitation Email:**

Recipient receives email with:
- Welcome message from you
- Link to create NextCRM account
- Expiration notice (link expires in 7 days)
- Information about your organization
- Role assignment details

**Invitation Status:**

Track invitations:
1. Go to **Admin Panel** → **User Management** → **Pending Invitations**
2. View all sent invitations with:
   - Recipient email
   - Sent date
   - Expiration date
   - Status (Sent, Opened, Expired)
3. Actions:
   - **Resend** - Send invitation again (extends expiration)
   - **Cancel** - Revoke invitation (link becomes invalid)

**Bulk Invitations:**

Invite multiple users at once:

1. Click **Bulk Invite**
2. Choose method:
   - **Upload CSV**: Columns: email, firstName, lastName, role
   - **Paste Emails**: One email per line (assigns default role)
3. Review and confirm
4. All invitations sent simultaneously

**Invitation Limits:**
- Starter Plan: 5 users
- Professional Plan: 25 users
- Enterprise Plan: Unlimited

**Auto-Approval (Optional):**

By default, invited users can create accounts immediately (status: Active). Optionally enable **Approval Workflow**:

1. Go to **Admin Panel** → **User Management** → **Settings**
2. Enable **Require Admin Approval for New Users**
3. Save

Now, when invited users create accounts:
- Status: Pending
- Admin receives notification
- Admin must manually approve (see next section)

### User Activation & Suspension

Manage user status:

**User Statuses:**

**Active:**
- Full access to NextCRM according to role
- Can log in, view/edit data, receive notifications

**Pending:**
- Account created but not yet approved by admin
- Cannot log in
- Used when approval workflow is enabled

**Inactive:**
- Voluntarily deactivated by admin or user
- Cannot log in
- Data remains in system
- Can be reactivated anytime

**Suspended:**
- Administratively locked (security concern, policy violation)
- Cannot log in
- Data remains in system
- Can be unsuspended by admin

**Approving Pending Users:**

When approval workflow is enabled:

1. Go to **Admin Panel** → **User Management** → **Pending Approvals**
2. View users awaiting approval
3. Click on user to review:
   - Email address
   - Registration date
   - IP address (for security verification)
   - Invitation details (if invited)
4. Options:
   - **Approve** - Activate user (status: Active)
   - **Deny** - Reject registration (user notified, account deleted)
   - **Request More Info** - Email user with questions before approving

**Deactivating Users:**

Temporarily disable an account:

1. Go to **Admin Panel** → **User Management**
2. Find user
3. Click **Actions** → **Deactivate**
4. Add reason (optional, for internal notes)
5. Confirm

**Effects:**
- User immediately logged out
- Cannot log in (sees "Account Inactive" message)
- Active sessions terminated
- Scheduled emails/tasks canceled
- Assigned records remain assigned (not automatically reassigned)

**Reactivating Users:**

Restore inactive account:

1. Go to **Admin Panel** → **User Management**
2. Filter by Status: Inactive
3. Find user
4. Click **Actions** → **Reactivate**
5. Confirm

User can immediately log in again.

**Suspending Users:**

Lock account for security reasons:

1. Go to **Admin Panel** → **User Management**
2. Find user
3. Click **Actions** → **Suspend**
4. Add reason (required) - e.g., "Suspected unauthorized access"
5. Check **Notify User** if you want them to receive suspension notification
6. Confirm

**Suspension vs Deactivation:**
- **Deactivation**: Normal offboarding (user left company, temporary absence)
- **Suspension**: Security issue or policy violation (serious)

**Unsuspending Users:**

1. Go to **Admin Panel** → **User Management**
2. Filter by Status: Suspended
3. Find user
4. Click **Actions** → **Unsuspend**
5. Add resolution notes (e.g., "Security issue resolved")
6. Confirm

### Password Management

Help users with password issues:

**Resetting User Passwords:**

Admin can reset any user's password:

1. Go to **Admin Panel** → **User Management**
2. Find user
3. Click **Actions** → **Reset Password**
4. Choose method:
   - **Email Reset Link** (recommended) - User receives password reset email
   - **Generate Temporary Password** - You receive temporary password to provide to user
5. Confirm

**Temporary Password Rules:**
- Valid for 24 hours
- Must be changed on first login
- Single use only

**Password Requirements:**

Set organization-wide password policy:

1. Go to **Admin Panel** → **Security Settings** → **Password Policy**
2. Configure:
   - **Minimum Length**: 8-32 characters (default: 12)
   - **Require Uppercase**: Yes/No (default: Yes)
   - **Require Lowercase**: Yes/No (default: Yes)
   - **Require Numbers**: Yes/No (default: Yes)
   - **Require Special Characters**: Yes/No (default: Yes)
   - **Password History**: Prevent reuse of last N passwords (default: 5)
   - **Password Expiration**: Require change every N days (0 = never, default: 90)
   - **Lockout Policy**: Lock account after N failed login attempts (default: 5)
3. Save

**Forcing Password Changes:**

Require specific users to change passwords:

1. Go to **Admin Panel** → **User Management**
2. Select users (checkboxes)
3. Click **Actions** → **Force Password Change**
4. Users prompted to change password on next login

Use cases:
- Suspected security breach
- Shared password detected
- Policy compliance (annual forced changes)

**Pro Tip**: Balance security with usability. Very strict password policies (16+ characters, special characters, 60-day expiration) lead to:
- Password reuse across systems
- Written-down passwords
- More support tickets
- User frustration

Recommended policy for most organizations:
- 12 character minimum
- Require uppercase, lowercase, number
- Optional special character
- 90-day expiration
- 5-attempt lockout

### User Activity Logs

Monitor what users are doing:

**Viewing Activity:**

1. Go to **Admin Panel** → **User Management** → **Activity Logs**
2. View all user actions:
   - **User**: Who performed action
   - **Action**: What they did (Created Lead, Updated Account, Sent Email, etc.)
   - **Record**: Which record was affected (with link)
   - **Timestamp**: When (date and time)
   - **IP Address**: Where from
   - **Device**: Desktop, mobile, tablet
   - **Browser**: Chrome, Safari, Firefox, etc.

**Filtering Activity:**

**By User:**
- Select specific user from dropdown
- View all their actions

**By Action Type:**
- Created, Updated, Deleted, Viewed, Exported, etc.
- Useful for tracking specific activity types

**By Date Range:**
- Today, Last 7 days, Last 30 days, Custom range
- Narrow down to specific time period

**By Record Type:**
- Account, Contact, Lead, Opportunity, etc.
- See activity for specific modules

**By IP Address:**
- Enter IP address or range
- Identify activity from specific location
- Useful for security investigations

**Exporting Activity Logs:**

1. Apply desired filters
2. Click **Export** (top right)
3. Choose format: CSV or Excel
4. Download file

Use cases:
- Compliance audits
- Security investigations
- Performance reviews
- Usage analysis

**Activity Retention:**
- Starter Plan: 90 days
- Professional Plan: 1 year
- Enterprise Plan: 7 years (configurable)

**Real-Time Monitoring:**

See who's currently using the system:

1. Go to **Admin Panel** → **User Management** → **Active Sessions**
2. View currently logged-in users:
   - User name
   - Login time
   - Last active (updates every 2 minutes)
   - IP address
   - Device
   - Browser

**Terminating Sessions:**

Force logout a user:

1. Find user in Active Sessions
2. Click **Terminate Session**
3. Confirm

User is immediately logged out. Useful for:
- Security incidents (compromised account)
- Enforcing single-session per user policy
- Troubleshooting (stale session causing issues)

### Removing Users

Permanently delete user accounts:

**Soft Delete vs Hard Delete:**

**Soft Delete (Recommended):**
- User status set to Inactive
- User cannot log in
- Data remains in system
- Records stay assigned to user (marked "Inactive User")
- Can be reactivated if needed
- No data loss

**Hard Delete (Permanent):**
- User account completely removed
- Cannot be reversed
- Data handling options (see below)
- Compliance with data deletion requests

**Soft Deleting a User:**

1. Go to **Admin Panel** → **User Management**
2. Find user
3. Click **Actions** → **Deactivate**
4. Confirm

**Hard Deleting a User:**

1. Go to **Admin Panel** → **User Management**
2. Find user (must be Inactive first)
3. Click **Actions** → **Delete Permanently**
4. Choose data handling:
   - **Reassign to Another User**: Select user to take ownership of all records
   - **Leave Unassigned**: Records remain but show no owner
   - **Delete Records**: Delete all records owned by this user (⚠️ DANGEROUS)
5. Review impact summary:
   - Number of accounts to be reassigned/deleted
   - Number of leads to be reassigned/deleted
   - Number of opportunities to be reassigned/deleted
   - etc.
6. Type user's email to confirm (prevents accidental deletion)
7. Click **Delete Permanently**

**Data Deletion Handling:**

**Comments & Activity:**
- User's comments remain (marked "Deleted User")
- Activity logs remain (required for audit trail)

**Emails:**
- Sent/received emails remain (linked to records)
- Email account disconnected

**Documents:**
- Uploaded documents remain (marked "Deleted User")
- Or reassigned to specified user

**Tasks:**
- Assigned tasks reassigned to specified user
- Or marked unassigned

**Reports:**
- Created reports transferred to Admin
- Or deleted

**Pro Tip**: Always soft delete first. Wait 30 days to ensure no issues, then hard delete if necessary. Most organizations never hard delete users for audit trail purposes.

### Bulk User Operations

Manage multiple users simultaneously:

**Bulk Actions Available:**

1. Go to **Admin Panel** → **User Management**
2. Select multiple users (checkboxes)
3. Click **Bulk Actions** dropdown:
   - **Change Role**: Assign new role to all selected
   - **Add to Team**: Add all to specified team
   - **Remove from Team**: Remove all from specified team
   - **Deactivate**: Deactivate all selected
   - **Reactivate**: Reactivate all selected
   - **Force Password Change**: Require password change for all
   - **Export Details**: Download CSV with user details

**Use Cases:**

**Onboarding New Team:**
- Bulk invite multiple new hires
- Assign them all to same team
- Set them all to Member role

**Offboarding Department:**
- Select all users from departing department
- Bulk deactivate
- Bulk reassign their records to manager

**Security Response:**
- Suspected breach affecting multiple accounts
- Select affected users
- Bulk force password change
- Bulk terminate sessions

**Annual Password Reset:**
- Select all users
- Bulk force password change
- Compliance requirement

---

## Roles & Permissions

### Organization Role Types

NextCRM uses a 4-tier role system:

**1. Owner**

**Full Access:**
- Everything Admins can do (see below)
- PLUS billing management:
  - View and update payment methods
  - Upgrade/downgrade subscription
  - View invoice history
  - Cancel subscription
- Can promote other users to Owner role
- Can delete organization (⚠️)

**Typical Use:**
- CEO, Founder, or Primary Decision Maker
- Usually 1-2 Owners per organization

**2. Admin**

**Full Administrative Access:**
- User management (invite, activate, suspend, delete users)
- Organization settings (branding, localization, company info)
- Module management (enable/disable features)
- Audit log access (view all activity)
- Security settings
- CANNOT access billing

**Data Access:**
- View all records (accounts, contacts, leads, etc.) in organization
- Edit all records
- Delete records (with restrictions based on org settings)
- Assign/reassign records
- Manage teams

**Typical Use:**
- IT Administrator
- Operations Manager
- Senior Sales Manager

**3. Member**

**Standard User Access:**
- Create and manage own records
- View records:
  - Owned by them
  - Shared with them
  - Owned by team members (if team visibility enabled)
- Edit records they own or that are shared with them (edit permission)
- Delete records they own (if deletion is enabled org-wide)
- No administrative functions

**Module Access:**
- Access depends on module enablement and plan features
- Can use all modules they have access to

**Typical Use:**
- Sales Representatives
- Customer Success Managers
- Marketing Coordinators
- Standard users

**4. Viewer**

**Read-Only Access:**
- View records:
  - Shared with them
  - Owned by team members (if team visibility enabled)
- Cannot create, edit, or delete anything
- Cannot change settings
- Can export data they can view (if export is enabled)
- Can add comments (if enabled)

**Typical Use:**
- Executives (overview without editing)
- External Contractors (limited access)
- Interns
- Reporting roles

### Permission Matrix

Detailed breakdown of what each role can do:

| **Capability** | **Owner** | **Admin** | **Member** | **Viewer** |
|---|---|---|---|---|
| **User Management** |
| View all users | ✅ | ✅ | ❌ | ❌ |
| Invite users | ✅ | ✅ | ❌ | ❌ |
| Approve users | ✅ | ✅ | ❌ | ❌ |
| Edit users | ✅ | ✅ | ❌ | ❌ |
| Deactivate/suspend users | ✅ | ✅ | ❌ | ❌ |
| Delete users | ✅ | ✅ | ❌ | ❌ |
| Change user roles | ✅ | ✅ | ❌ | ❌ |
| Reset passwords | ✅ | ✅ | ❌ | ❌ |
| **Organization Settings** |
| Edit company info | ✅ | ✅ | ❌ | ❌ |
| Edit branding | ✅ | ✅ | ❌ | ❌ |
| Edit localization | ✅ | ✅ | ❌ | ❌ |
| Module management | ✅ | ✅ | ❌ | ❌ |
| Security settings | ✅ | ✅ | ❌ | ❌ |
| **Billing** |
| View billing | ✅ | ❌ | ❌ | ❌ |
| Update payment method | ✅ | ❌ | ❌ | ❌ |
| Upgrade/downgrade | ✅ | ❌ | ❌ | ❌ |
| View invoices | ✅ | ❌ | ❌ | ❌ |
| Cancel subscription | ✅ | ❌ | ❌ | ❌ |
| **Data Access** |
| View all org records | ✅ | ✅ | Own + Shared + Team* | Shared + Team* |
| Create records | ✅ | ✅ | ✅ | ❌ |
| Edit all records | ✅ | ✅ | Own + Shared** | ❌ |
| Delete all records | ✅ | ✅ | Own only*** | ❌ |
| Reassign records | ✅ | ✅ | Own only | ❌ |
| Export data | ✅ | ✅ | ✅ | ✅**** |
| **Audit & Compliance** |
| View audit logs | ✅ | ✅ | Own only | ❌ |
| Export audit logs | ✅ | ✅ | ❌ | ❌ |
| **Modules** |
| CRM (Accounts, Contacts, Leads) | ✅ | ✅ | ✅ | Read-only |
| Opportunities | ✅ | ✅ | ✅ | Read-only |
| Projects & Tasks | ✅ | ✅ | ✅ | Read-only |
| Documents | ✅ | ✅ | ✅ | Read-only |
| Invoices | ✅ | ✅ | ✅ | Read-only |
| Emails | ✅ | ✅ | ✅ | ❌ |
| Reports | ✅ | ✅ | ✅ | ✅ |

**Notes:**
- \* Team visibility depends on organization settings
- \*\* Edit permission depends on share settings
- \*\*\* Deletion may be restricted org-wide
- \*\*\*\* Export may be restricted org-wide

### Record-Level Permission Rules

Beyond roles, record-level permissions apply:

**Visibility Rules (who can see a record):**

A user can view a record if:
1. They own it (assigned_to = user), OR
2. They created it (created_by = user), OR
3. It's shared with them (shared_with includes user), OR
4. They're on the record's team (if team visibility enabled), OR
5. They have Admin/Owner role (see all), OR
6. The record is marked "Organization Visible" (everyone can see)

**Edit Rules (who can modify a record):**

A user can edit a record if:
1. They own it, OR
2. It's shared with them WITH edit permission, OR
3. They have Admin/Owner role

**Delete Rules (who can delete a record):**

A user can delete a record if:
1. They own it AND deletion is enabled org-wide, OR
2. They have Admin/Owner role

**Watcher Rules:**

Watchers on a record:
- Receive notifications about record changes
- Can view the record
- Cannot edit (unless they also meet edit rules above)
- Can comment

**Pro Tip**: Design your sharing rules carefully. Too restrictive = collaboration suffers. Too open = data privacy concerns. Most organizations use:
- Team visibility enabled (team members see each other's records)
- Organization visibility disabled (not everyone sees everything)
- Watchers for cross-team collaboration

### Data Isolation & Multi-Tenancy

NextCRM enforces strict data isolation:

**Organization-Level Isolation:**

Every record in NextCRM belongs to exactly one organization:
- Database field: `organizationId`
- All queries automatically filter by current user's organization
- No cross-organization data access possible
- Even NextCRM support cannot see your data without explicit permission

**How It Works:**

1. User logs in with email/password
2. NextCRM identifies their organization
3. Session token includes organizationId
4. All database queries include `WHERE organizationId = [user's org]`
5. API requests without valid organizationId are rejected

**Benefits:**

- **Security**: Impossible to accidentally access another organization's data
- **Performance**: Queries only search your organization's data (faster)
- **Compliance**: Clear data boundaries for GDPR, SOC 2, etc.
- **Scalability**: Each organization's data is logically separated

**Team Member Visibility:**

Within your organization:
- Default: Users only see their own records
- Optional: Enable team visibility (users see team members' records)
- Always: Admins/Owners see all org records

**No Cross-Org Visibility:**

Even if two organizations have:
- Same email domain (user@acme.com in two different Acme Corp orgs)
- Shared account names (both have "Acme Corp" as an account)
- Shared data (both working with same customer)

They NEVER see each other's data. Each organization is completely isolated.

**API Access:**

API requests must include:
- Valid API key (contains organizationId)
- All returned data belongs to that organization only
- Cross-org API access not possible

**Pro Tip**: If you need to work across multiple organizations (e.g., consultant with multiple clients), create separate user accounts for each organization. You can switch between them using account switcher.

### Sharing & Collaboration Controls

Manage how users collaborate:

**Team Visibility:**

Enable/disable team visibility:

1. Go to **Admin Panel** → **Settings** → **Privacy**
2. Toggle **Team Visibility**:
   - **Enabled**: Team members see each other's records
   - **Disabled**: Users only see their own records (unless shared)
3. Save

**When Enabled:**
- Members of same team can view each other's accounts, leads, contacts, opportunities
- Promotes collaboration
- Reduces need for manual sharing

**When Disabled:**
- Maximum privacy
- Each user only sees their own records
- Must explicitly share for collaboration

**Record Sharing:**

Users can share records they own:

1. Open record (Account, Lead, etc.)
2. Click **Share** button
3. Search for team member(s)
4. Set permission level:
   - **View**: Can see record and activity
   - **Edit**: Can modify record
   - **Admin**: Can modify and delete record
5. Add optional message
6. Click **Share**

**Sharing Permissions:**

Control who can share:

1. Go to **Admin Panel** → **Settings** → **Sharing**
2. Configure:
   - **Members Can Share Own Records**: Yes/No
   - **Members Can Share with Viewers**: Yes/No (if No, Members can only share with other Members/Admins)
   - **Automatic Sharing**: Auto-share records when user is added as Watcher
3. Save

**Watchers System:**

Watchers receive notifications but don't necessarily have edit access:

**Adding Watchers:**
- Open record
- Click **Add Watchers**
- Select user(s)
- Watchers receive notifications for:
  - Record updates
  - Comments
  - Status changes
  - Related activity

**Watchers vs Shared:**
- **Shared**: Explicit access granted (view or edit)
- **Watcher**: Notification recipient (may or may not have view access)
- Users can be both

**Comment Visibility:**

Control who can see comments:

1. Go to **Admin Panel** → **Settings** → **Comments**
2. Configure:
   - **Default Visibility**: Private (only shared users) or Public (all who can view record)
   - **Allow Private Comments**: Yes/No
   - **Viewers Can Comment**: Yes/No
3. Save

**Email Visibility:**

Control email privacy:

1. Go to **Admin Panel** → **Settings** → **Email**
2. Configure:
   - **Team Can View Emails**: Linked emails visible to team
   - **Organization Can View Emails**: All org members can see linked emails
   - **Private Emails Only**: Only sender/recipient can see emails
3. Save

### Permission Best Practices

**Principle of Least Privilege:**

Grant minimum permissions necessary:
- Start users as Members (not Admins)
- Promote to Admin only when truly needed
- Regularly review and downgrade unnecessary Admin access

**Role Review Cycle:**

Audit roles quarterly:
1. Export user list with roles
2. For each Admin/Owner:
   - Do they still need this access?
   - Have they changed roles/departments?
   - Are they actively using admin features?
3. Downgrade roles that no longer need elevated access
4. Document decisions

**Separation of Duties:**

Divide responsibilities:
- Owner: Handles billing (Finance or CEO)
- Admin: Manages users and settings (IT or Operations)
- Members: Day-to-day CRM work (Sales, Support, Marketing)

Don't grant Owner role to everyone who needs admin features. Use Admin role instead.

**Temporary Elevated Access:**

When a user needs temporary admin access:
1. Promote to Admin role
2. Add calendar reminder to revert in X days/weeks
3. Revert to Member when project is complete
4. Document reason in user's admin notes

**Team Structure:**

Organize users into teams by:
- **Department**: Sales, Marketing, Support, Engineering
- **Geography**: North America, EMEA, APAC
- **Product Line**: Product A Team, Product B Team
- **Account Segment**: Enterprise, SMB, Startup

Then use team visibility and team-based sharing for natural collaboration boundaries.

**Security Considerations:**

**High-Risk Actions:**
- Creating/deleting users
- Changing user roles
- Editing organization settings
- Viewing billing information
- Exporting all data

Limit these to Owner/Admin roles only. Consider requiring 2FA for Admin/Owner roles.

**Regular Audits:**

Monthly security checks:
1. Review Admin Panel → Audit Logs for suspicious activity
2. Check for:
   - Bulk data exports (could indicate data theft)
   - After-hours access (unusual times)
   - Access from unexpected IPs/locations
   - Failed login attempts (brute force?)
3. Investigate anomalies

**Permission Checklist:**

Before granting Admin role, ask:
- [ ] Does this person need to manage users?
- [ ] Do they need to change organization settings?
- [ ] Do they need to view all records (not just their team)?
- [ ] Do they need access to audit logs?
- [ ] Have they completed security training?
- [ ] Have they enabled 2FA on their account?

If any answer is "No," consider Member role with specific shares instead.

---

## Module Management

### Enabling/Disabling Modules

Control which features are available:

**Accessing Module Management:**

1. Go to **Admin Panel** → **Modules**
2. View all available modules:
   - CRM (Accounts, Contacts, Leads, Opportunities)
   - Projects & Tasks
   - Documents
   - Invoices
   - Emails
   - Reports
   - AI Features (Enterprise)

**Module Status:**
- **Enabled**: Active and visible to users
- **Disabled**: Hidden from navigation, data preserved
- **Not Available**: Requires plan upgrade

**Enabling a Module:**

1. Find module in list
2. If "Not Available," click **Upgrade Plan** (see Billing section)
3. If available, click **Enable**
4. Configure module settings (if any)
5. Click **Save**
6. Module appears in main navigation immediately

**Disabling a Module:**

1. Find enabled module
2. Click **Disable**
3. Warning: "Users will lose access to this module. Data will be preserved."
4. Confirm

**Effects:**
- Module removed from main navigation
- Users cannot access module pages
- Data remains in database (not deleted)
- API access to module disabled
- Re-enabling restores full access

**Pro Tip**: Disable unused modules to simplify navigation and improve performance. Users won't be distracted by features they don't use.

### Module-Specific Permissions

Some modules have granular permissions:

**CRM Module:**
- Who can create Accounts (Members, or Admins only)
- Who can delete Contacts (Own only, or Admins only)
- Who can convert Leads to Accounts (Members, or Admins only)
- Who can export CRM data (All users, or Admins only)

**Projects Module:**
- Who can create Projects (Members, or Admins only)
- Who can close Projects (Project Owner, or Admins only)
- Task visibility (All project members, or assigned user only)

**Documents Module:**
- Who can upload Documents (All users, or specific roles)
- Max file size by role
- Who can create public sharing links (Admins only, or all users)
- Who can delete Documents (Own only, or Admins only)

**Invoices Module:**
- Who can create Invoices (Admins only, or all users)
- Who can approve Invoices (Admins only, or assigned approver)
- Who can export financial data (Owner only)

**Email Module:**
- Who can connect email accounts (All users, or Admins only)
- Who can use email tracking (All users, or specific roles)
- Who can create templates (All users, or Admins only)
- Who can see others' emails (Team only, or all org)

**Configuring Module Permissions:**

1. Go to **Admin Panel** → **Modules**
2. Click on module name
3. Select **Permissions** tab
4. Adjust permissions for each capability
5. Click **Save**

Changes take effect immediately.

### Feature Access by Plan

Different features available by subscription plan:

| **Feature** | **Starter** | **Professional** | **Enterprise** |
|---|---|---|---|
| **Users** | Up to 5 | Up to 25 | Unlimited |
| **CRM Module** | ✅ | ✅ | ✅ |
| **Opportunities** | ✅ | ✅ | ✅ |
| **Projects** | ❌ | ✅ | ✅ |
| **Documents** (storage) | 25 GB | 100 GB | 1 TB |
| **Invoices** | ❌ | ✅ | ✅ |
| **Email Integration** | ✅ (1 account) | ✅ (Unlimited) | ✅ (Unlimited) |
| **Email Tracking** | ❌ | ✅ | ✅ |
| **Email Templates** | ❌ | ✅ | ✅ |
| **Reports** | Basic | Advanced | Custom |
| **API Access** | ❌ | Read-only | Full |
| **Custom Fields** | 5 per module | 25 per module | Unlimited |
| **Audit Logs** (retention) | 90 days | 1 year | 7 years |
| **AI Features** | ❌ | ❌ | ✅ |
| **Custom Branding** | ❌ | Logo only | Full |
| **Custom Domain** | ❌ | ❌ | ✅ |
| **SSO (SAML)** | ❌ | ❌ | ✅ |
| **Dedicated Support** | ❌ | ❌ | ✅ |
| **SLA** | None | 99.5% | 99.9% |

**Upgrade Required:**

If users try to access unavailable features:
- They see "Upgrade Required" message
- Message explains which plan includes the feature
- Link to upgrade page (visible to Owners only)

**Feature Rollout:**

When you upgrade plans:
1. New features are immediately available
2. Admins receive notification
3. Announce to team via email or announcement
4. Provide training if needed (especially for major features like AI)

---

## Audit & Compliance

### Viewing Audit Logs

Track all system activity for compliance:

**Accessing Audit Logs:**

1. Go to **Admin Panel** → **Audit & Compliance** → **Audit Logs**
2. View comprehensive activity log:
   - **Timestamp**: When action occurred
   - **User**: Who performed action (or "System" for automated)
   - **Action Type**: Create, Read, Update, Delete, Export, Login, Logout
   - **Resource**: What was affected (Account, Contact, User, Setting, etc.)
   - **Resource ID**: Specific record ID
   - **Changes**: What changed (before/after values for updates)
   - **IP Address**: Source IP
   - **User Agent**: Browser and device
   - **Result**: Success or Failure

**Filterable Fields:**

**By User:**
- Select specific user
- View all their actions
- Useful for performance reviews or security investigations

**By Action Type:**
- Create: All new records
- Update: All modifications
- Delete: All deletions (CRITICAL for compliance)
- Export: All data exports (security concern)
- Login/Logout: Authentication events
- Settings Change: Organization settings modified
- Permission Change: Role or access changes

**By Resource Type:**
- Account, Contact, Lead, Opportunity
- User, Role, Permission
- Document, Email, Invoice
- Organization Settings
- Billing

**By Date Range:**
- Last 24 hours
- Last 7 days
- Last 30 days
- Last 90 days
- Custom range

**By IP Address:**
- Enter IP or IP range
- Identify actions from specific location
- Useful for geographic access reviews

**By Result:**
- Success: Action completed
- Failure: Action attempted but failed (permission denied, validation error, etc.)
- Failures may indicate attack attempts

**Audit Log Detail View:**

Click any log entry to see full details:
- Complete before/after values (for updates)
- Full request payload (for API calls)
- Error messages (for failures)
- Related log entries (actions in same session)

### Exporting Audit Logs

Download logs for compliance audits:

**Export Options:**

1. Apply desired filters
2. Click **Export** (top right)
3. Choose format:
   - **CSV**: Opens in Excel, easy filtering
   - **JSON**: Machine-readable, for analysis tools
   - **PDF**: Formatted report, for auditors
4. Choose date range (respects current filters)
5. Click **Generate Export**

**Export Limits:**
- Starter: 1,000 records per export
- Professional: 10,000 records per export
- Enterprise: Unlimited

Large exports are emailed (download link valid for 7 days).

**Scheduled Exports:**

Automate regular audit log exports:

1. Go to **Admin Panel** → **Audit & Compliance** → **Scheduled Exports**
2. Click **New Scheduled Export**
3. Configure:
   - **Name**: e.g., "Monthly Audit Log for Compliance Team"
   - **Frequency**: Daily, Weekly, Monthly
   - **Filter**: Which logs to include (e.g., only Delete actions)
   - **Format**: CSV, JSON, or PDF
   - **Recipients**: Email addresses to send to
4. Save

Exports are automatically generated and emailed on schedule.

**Pro Tip**: Set up monthly scheduled export of all Delete actions to your compliance team. Required for many regulatory frameworks (SOC 2, ISO 27001, GDPR).

### GDPR Compliance Features

Tools for GDPR compliance:

**Data Subject Access Requests (DSAR):**

When a user requests their data:

1. Go to **Admin Panel** → **Audit & Compliance** → **GDPR**
2. Click **New Data Access Request**
3. Enter user's email
4. Click **Generate Report**
5. NextCRM compiles:
   - User profile information
   - All records they created or own
   - All comments they made
   - All documents they uploaded
   - All emails they sent/received
   - All activity log entries involving them
6. Download ZIP file (includes JSON and human-readable PDF)
7. Provide to data subject within 30 days (GDPR requirement)

**Right to Deletion ("Right to be Forgotten"):**

When a user requests deletion:

1. Go to **Admin Panel** → **Audit & Compliance** → **GDPR**
2. Click **New Deletion Request**
3. Enter user's email
4. Review what will be deleted/anonymized:
   - User account
   - Personal information
   - Comments (replace name with "Anonymous User")
   - Activity logs (anonymize user reference)
5. Choose handling for owned records:
   - Reassign to another user
   - Leave orphaned (no owner)
   - Delete records (rare, usually not appropriate)
6. Click **Process Deletion**
7. User is permanently removed within 30 days

**Data Processing Agreement (DPA):**

Enterprise customers can request signed DPA:
1. Go to **Admin Panel** → **Audit & Compliance** → **Legal Documents**
2. Click **Request DPA**
3. Fill in your organization's legal details
4. NextCRM generates custom DPA
5. Both parties sign (DocuSign integration)
6. Stored in Documents module

**Consent Management:**

Track consent for email marketing and data processing:

1. Go to **Admin Panel** → **Audit & Compliance** → **Consent**
2. View consent status for all contacts:
   - Marketing emails: Opted in or out
   - Data processing: Consent given or not
   - Timestamp of consent
   - Method of consent (webform, email, phone, etc.)
3. Export consent records for audits

**Data Retention Policies:**

Set automatic deletion schedules:

1. Go to **Admin Panel** → **Audit & Compliance** → **Retention**
2. Configure policies by record type:
   - **Leads (Closed Lost)**: Delete after 2 years
   - **Activity Logs**: Delete after 7 years
   - **Documents (Archived)**: Delete after 10 years
3. System automatically deletes records matching criteria
4. You receive monthly summary of deleted data

### SOC 2 Compliance

Tools for SOC 2 audits:

**Access Reviews:**

Quarterly access review reports:

1. Go to **Admin Panel** → **Audit & Compliance** → **Access Reviews**
2. Click **Generate Access Review**
3. Report includes:
   - All users and their roles
   - Last active date
   - Records accessed in past 90 days
   - Data exported in past 90 days
   - Role changes in past 90 days
4. Review with security team
5. Identify and remove unnecessary access
6. Mark review as complete (timestamp recorded)

**Security Incident Log:**

Document security incidents:

1. Go to **Admin Panel** → **Audit & Compliance** → **Security Incidents**
2. Click **Log Incident**
3. Fill in details:
   - Incident type (Data breach, Unauthorized access, etc.)
   - Discovery date
   - Description
   - Affected users/data
   - Response actions taken
   - Resolution date
4. Save

Required for SOC 2 audits (show you track and respond to incidents).

**Change Management Log:**

Track system configuration changes:

1. Go to **Admin Panel** → **Audit & Compliance** → **Change Log**
2. View all organization setting changes:
   - Who made change
   - What changed (before/after values)
   - When
   - Why (if change note was provided)
3. Export for auditors

### Retention Policies

Manage data lifecycle:

**Creating Retention Policies:**

1. Go to **Admin Panel** → **Audit & Compliance** → **Retention Policies**
2. Click **New Policy**
3. Configure:
   - **Name**: e.g., "Closed-Lost Leads Retention"
   - **Applies To**: Select record type (Leads, Accounts, Documents, etc.)
   - **Condition**: What triggers the policy (e.g., Status = "Closed Lost")
   - **Retain For**: Duration (1 year, 3 years, 7 years, 10 years, indefinitely)
   - **After Retention Period**:
     - Delete permanently
     - Archive (soft delete, recoverable)
     - Request manual review
4. Save

**System evaluates policies daily at midnight (your timezone).**

**Common Retention Policies:**

**Leads:**
- Closed Lost: 2 years, then delete
- Closed Won: Indefinitely (converted to Account)
- Inactive (no activity in 1 year): 1 additional year, then delete

**Accounts:**
- Active customers: Indefinitely
- Closed accounts: 7 years (tax purposes), then archive

**Activity Logs:**
- All activities: 7 years, then delete

**Documents:**
- Contracts: 7 years after expiration, then archive
- Invoices: 7 years (tax law), then archive
- Marketing materials: 3 years, then delete

**Emails:**
- Linked to active records: Indefinitely
- Unlinked: 1 year, then delete

**Legal Hold:**

Prevent deletion during litigation:

1. Open record that's under legal hold
2. Click **Settings** → **Legal Hold**
3. Enable legal hold
4. Add case reference number and notes
5. Save

Record is exempt from all retention policies and deletion until legal hold is removed.

**Pro Tip**: Consult with legal counsel to determine appropriate retention periods for your industry and jurisdiction. Common frameworks: SOX (7 years), HIPAA (6 years), GDPR (as long as necessary).

---

## Billing & Subscription

### Current Plan Information

View subscription details:

**Accessing Billing:**

1. Go to **Admin Panel** → **Billing** (Owner role required)
2. View current plan:
   - **Plan Name**: Starter, Professional, or Enterprise
   - **Billing Cycle**: Monthly or Annual
   - **Price**: Current monthly/annual cost
   - **Renewal Date**: When next payment is due
   - **Status**: Active, Past Due, Canceled

### Usage Statistics

Monitor consumption:

**User Licenses:**
- Users: 3 of 5 (Starter), 12 of 25 (Professional), 47 of Unlimited (Enterprise)
- Active users count toward limit
- Inactive users don't count

**Storage:**
- Documents: 12.4 GB of 25 GB (Starter)
- Upgrade prompt if approaching limit

**API Calls (Professional/Enterprise):**
- Calls this month: 45,234 of 100,000 included
- Overage charges: $0.01 per 100 calls over limit

**Email Sends:**
- Emails this month: 1,240 (no limit, but monitored for abuse)

**Audit Log Storage:**
- Logs retained: 87 days of 90 days (Starter)

**Forecasting:**

View projected usage:
- "At current rate, you'll exceed storage limit in 42 days"
- "Consider upgrading to Professional plan"

### Upgrading/Downgrading Plans

Change subscription level:

**Upgrading:**

1. Go to **Admin Panel** → **Billing** → **Upgrade Plan**
2. View available plans with feature comparison
3. Select plan (Professional or Enterprise)
4. Choose billing cycle:
   - Monthly (full price)
   - Annual (15-20% discount)
5. Review pricing:
   - New monthly/annual cost
   - Prorated credit for remaining time on current plan
   - First charge amount
6. Click **Upgrade**
7. Payment processed immediately
8. New features available instantly

**Downgrading:**

1. Go to **Admin Panel** → **Billing** → **Change Plan**
2. Select lower plan
3. Review what you'll lose:
   - User seats (if you have more users than new plan allows)
   - Features (Projects, Invoices, etc.)
   - Storage (if currently using more than new plan includes)
4. Warning: "You must deactivate 10 users and delete 50GB of documents before downgrading"
5. Address issues (deactivate users, delete documents)
6. Confirm downgrade
7. Effective at end of current billing period (not immediate)
8. Prorated credit applied to future billing

**Mid-Month Changes:**

Upgrades: Immediate (prorated billing)
Downgrades: Effective at end of billing period (no prorated refund)

### Invoice History

Access past invoices:

1. Go to **Admin Panel** → **Billing** → **Invoices**
2. View all invoices:
   - Invoice number
   - Date
   - Amount
   - Status (Paid, Past Due, Refunded)
   - Download (PDF)
3. Click any invoice to view details:
   - Line items (subscription, add-ons, overages)
   - Payment method used
   - Billing address
   - Tax calculations

**Email Invoices:**

Invoices are automatically emailed to Owner's email address. Add additional recipients:

1. Go to **Admin Panel** → **Billing** → **Settings**
2. Add **Invoice Notification Emails** (comma-separated)
3. Save

### Managing Payment Methods

Update billing information:

**Viewing Payment Methods:**

1. Go to **Admin Panel** → **Billing** → **Payment Methods**
2. View saved payment methods:
   - Credit/debit cards (last 4 digits, expiration, brand)
   - Bank accounts (last 4 digits, bank name)
   - Default payment method marked

**Adding Payment Method:**

1. Click **Add Payment Method**
2. Choose type:
   - Credit/Debit Card
   - Bank Account (ACH - US only)
3. Enter details securely (handled by Stripe, NextCRM never sees full card number)
4. Click **Save**

**Setting Default Payment Method:**

1. Find payment method in list
2. Click **Set as Default**
3. Future charges use this method

**Removing Payment Method:**

1. Find payment method
2. Click **Remove**
3. Confirm

Cannot remove default payment method if it's the only one.

**Payment Failures:**

If payment fails:
1. You receive email notification immediately
2. NextCRM retries payment after 3 days
3. If still fails, retries after 7 days
4. Account suspended if payment not received within 14 days
5. Account deleted if payment not received within 30 days (after multiple reminders)

**Update Payment Method Immediately:**

1. Go to **Admin Panel** → **Billing** → **Retry Payment**
2. Update payment method if needed
3. Click **Retry Charge**

---

## Support & Resources

### Contacting Support

Get help when you need it:

**Support Channels:**

**Email Support:**
- Email: support@nextcrm.io
- Response time:
  - Starter: 48-72 hours
  - Professional: 24 hours
  - Enterprise: 4 hours (business hours), 24 hours (after hours)

**Live Chat (Professional/Enterprise):**
- Click **Help** icon (bottom right)
- Chat with support agent (business hours: 9 AM - 5 PM EST)

**Phone Support (Enterprise only):**
- Dedicated support line provided
- Business hours support included
- 24/7 support available (add-on)

**Community Forum:**
- community.nextcrm.io
- Ask questions, share tips, request features
- Peer support from other NextCRM users

**Knowledge Base:**
- docs.nextcrm.io
- Searchable documentation
- Video tutorials
- Step-by-step guides

**What to Include in Support Requests:**

1. **Problem Description**: What's happening? What did you expect?
2. **Steps to Reproduce**: How can we recreate the issue?
3. **Screenshots**: Show the problem visually
4. **Browser/Device**: Chrome 115 on Windows 11, Safari on iPhone, etc.
5. **User Role**: Admin, Member, Viewer?
6. **Affected Users**: Just you, or everyone?
7. **When Started**: Has it ever worked? When did it break?
8. **Error Messages**: Exact text of any errors

**Response Time SLA:**

| **Priority** | **Starter** | **Professional** | **Enterprise** |
|---|---|---|---|
| Critical (system down) | Best effort | 4 hours | 1 hour |
| High (feature broken) | 72 hours | 24 hours | 4 hours |
| Medium (inconvenience) | 5 days | 48 hours | 24 hours |
| Low (question, how-to) | 7 days | 72 hours | 48 hours |

### Feature Requests

Suggest improvements:

**Submitting Feature Requests:**

1. Go to **Admin Panel** → **Support** → **Feature Requests**
2. Search existing requests (your idea may already exist - upvote it!)
3. If new, click **New Feature Request**
4. Fill in:
   - **Title**: Short, descriptive (e.g., "Bulk Email Send from Contacts")
   - **Description**: Detailed explanation of feature
   - **Use Case**: Why do you need this? What problem does it solve?
   - **Priority**: How important (Nice to have, Important, Critical)
5. Submit

**Tracking Requests:**

View status of your feature requests:
- **Submitted**: Under review by product team
- **Planned**: Approved, scheduled for future release
- **In Progress**: Actively being developed
- **Completed**: Released (you'll be notified)
- **Declined**: Not planned (with explanation)

**Voting:**

Vote on others' feature requests:
- More votes = higher priority for product team
- Enterprise customers' votes weighted higher

### Bug Reporting

Report issues:

**Reporting a Bug:**

1. Go to **Admin Panel** → **Support** → **Report Bug**
2. Fill in bug report:
   - **Summary**: Brief description
   - **Steps to Reproduce**: Exact steps to trigger bug
   - **Expected Behavior**: What should happen
   - **Actual Behavior**: What actually happens
   - **Frequency**: Always, Sometimes, Once
   - **Screenshots/Video**: Attach visual evidence (recommended)
3. Submit

**Bug Tracking:**

View status of reported bugs:
- **New**: Under investigation
- **Confirmed**: Reproduced by support team
- **In Progress**: Being fixed
- **Fixed**: Deployed (you'll be notified)
- **Cannot Reproduce**: Need more information from you

**Critical Bugs:**

For critical issues (data loss, security vulnerability, system down):
1. Report via email: security@nextcrm.io (for security issues) or support@nextcrm.io (for critical bugs)
2. Include "CRITICAL" in subject line
3. Expect immediate response (Enterprise: within 1 hour)

---

**Need Help?** Contact support at support@nextcrm.io or see the [Troubleshooting Guide](TROUBLESHOOTING.md) for common issues.

**Related Guides:**
- [Permissions Guide](PERMISSIONS-GUIDE.md) - Detailed permissions documentation
- [User Guide](CRM-GUIDE.md) - End-user CRM usage
- [Troubleshooting Guide](TROUBLESHOOTING.md) - Common problems and solutions
