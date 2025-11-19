# Permissions & Access Control Guide

## Permission System Overview

NextCRM uses a comprehensive permission system to control who can access what data and perform which actions. Understanding permissions is essential for administrators managing team access and maintaining data security.

### Why Permissions Matter

- **Security**: Prevent unauthorized access to sensitive data
- **Privacy**: Team members only see data relevant to their role
- **Compliance**: Meet GDPR and regulatory requirements
- **Efficiency**: Reduce clutter by showing only relevant information
- **Accountability**: Track who did what with audit logs

### Permission Types

NextCRM uses three levels of permission control:

1. **Organization Permissions** - What users can do at the organization level
2. **Module Permissions** - What users can do within each module (CRM, Projects, etc.)
3. **Record Permissions** - What data users can see and edit

## Organization Roles

### Owner Role

**Full System Access**

Owners have complete control over the organization:
- Create/edit/delete all records
- Invite and manage team members
- Manage organization settings
- Access billing and subscriptions
- Create other Owner accounts
- View all audit logs
- Enable/disable modules

**Responsibilities:**
- Ensure team members have appropriate access
- Manage billing and payment
- Monitor system usage and compliance
- Regular permission audits

**When to Use:**
- Founding team members
- C-level executives
- System administrators

**Best Practice:** Limited to 1-2 people maximum

---

### Admin Role

**Full Feature Access (Except Billing)**

Admins manage day-to-day operations:
- Create/edit/delete all records
- Invite and manage team members
- Manage organization settings (except billing)
- Access billing info (view-only)
- Enable/disable modules
- View audit logs
- Cannot create other admins

**Cannot Do:**
- Change subscription/plan
- Update payment methods
- View or modify invoices

**When to Use:**
- Department heads
- Sales managers
- Operations managers
- Senior team members

**Best Practice:** 2-5 per organization, depending on size

---

### Member Role

**Create and Edit Records**

Members are standard contributors:
- Create new records (accounts, leads, projects)
- Edit records assigned to them
- View records shared with them
- Collaborate (comments, watchers)
- Cannot manage users
- Cannot access admin features
- Cannot view organization settings

**Permissions:**
- Create in all modules
- Edit own records
- Cannot delete records
- Cannot change record owners

**When to Use:**
- Sales representatives
- Project managers
- Support team members
- Team contributors

**Best Practice:** Majority of team members

---

### Viewer Role

**Read-Only Access**

Viewers can observe but not modify:
- View records
- View dashboards and reports
- Download documents
- Cannot create or edit anything
- Cannot delete anything
- Cannot invite users

**Permissions:**
- Read-only on all data
- View reports and analytics
- Download documents
- Cannot make changes

**When to Use:**
- Executives/stakeholders (overview)
- External consultants (limited visibility)
- Auditors (compliance)
- Clients (portal view, if enabled)

**Best Practice:** Use sparingly for oversight roles

---

## Permission Matrix

Complete capability matrix by role:

| Capability | Owner | Admin | Member | Viewer |
|-----------|-------|-------|--------|--------|
| **User Management** | | | | |
| Invite users | ✅ | ✅ | ❌ | ❌ |
| Change user roles | ✅ | ✅ | ❌ | ❌ |
| Suspend/remove users | ✅ | ✅ | ❌ | ❌ |
| Reset user password | ✅ | ✅ | ❌ | ❌ |
| **Organization** | | | | |
| View settings | ✅ | ✅ | ❌ | ❌ |
| Edit settings | ✅ | ✅ | ❌ | ❌ |
| View billing info | ✅ | ✅ (view) | ❌ | ❌ |
| Manage billing | ✅ | ❌ | ❌ | ❌ |
| **Modules** | | | | |
| Enable/disable modules | ✅ | ✅ | ❌ | ❌ |
| **Records** | | | | |
| Create records | ✅ | ✅ | ✅ | ❌ |
| Edit records | ✅ | ✅ | ✅* | ❌ |
| Delete records | ✅ | ✅ | ❌ | ❌ |
| View reports | ✅ | ✅ | ✅ | ✅ |
| Export data | ✅ | ✅ | ✅ | ✅ |
| **Audit** | | | | |
| View audit logs | ✅ | ✅ | ❌ | ❌ |
| Export audit logs | ✅ | ✅ | ❌ | ❌ |

*Members can only edit records assigned to them or shared with them

---

## Record-Level Permissions

### Assigned To (Ownership)

When a record is assigned to a user:
- Assigned user: Full access (view, edit, delete)
- Other members: View-only (cannot edit)
- Watchers: Notified of changes
- Admins/Owners: Always full access

**Example:**
- Sales rep Sarah is assigned Account "Acme Corp"
- Sarah can edit all fields
- Colleagues can view but not edit
- Manager John can edit (as admin)

### Shared With (Collaboration)

When a record is explicitly shared:
- Shared user gets specified access level
- Original owner retains access
- Can be revoked by owner
- Can set expiration dates

**Share Levels:**
- **Viewer**: Can only view record
- **Editor**: Can view and edit record
- **None**: Remove access

### Team Visibility

Records may be visible to entire team:
- Admins/Owners can set team visibility
- "Team Only" - All team members can view
- "Private" - Only owner, assigns, and admins
- "Public" - Anyone with link (if enabled)

### Data Visibility Rules

**What users see:**
1. Records assigned to them (can always see own)
2. Records shared with them explicitly
3. Records in team-visible projects/groups
4. Records they created (if team visible)

**What users don't see:**
- Private records of other team members
- Records outside their organization
- Records from other organizations
- Deleted records

---

## Sharing & Collaboration

### Sharing Individual Records

**Share a record:**
1. Open record (Account, Lead, Project, etc.)
2. Click "Share"
3. Select team member
4. Choose access level (Viewer or Editor)
5. Click "Share"

**Recipient gets:**
- Email notification with link
- Access to view/edit as specified
- Notification in NextCRM app

**Remove sharing:**
1. Open record
2. Find recipient in "Shared With" list
3. Click remove icon
4. Access revoked immediately

### Watchers System

**Add watchers to stay notified:**
1. Open record
2. Click "Add Watcher" or "Watch"
3. Select team members
4. They receive notifications of:
   - New comments
   - Field changes
   - Status updates
   - Record activity

**Who's watching:**
- Record shows list of current watchers
- Watchers can remove themselves
- Owners can remove watchers

**When to use:**
- Keep manager informed of progress
- Multiple people need updates
- Don't need full edit access

### Comments & Collaboration

**Comment visibility:**
- Comments visible to all with record access
- @mentions send notifications to specific people
- Comment notifications via email or app
- Comment activity triggers watchers

**Edit comments:**
- Edit within 5 minutes of posting
- Deletion available to admins
- Edit history available in activity log

---

## Best Practices

### Principle of Least Privilege

Grant minimal access necessary:
- Start with Viewer role
- Promote to Member when needed
- Promote to Admin only for team leads
- Reserve Owner role for founders/executives

### Regular Permission Audits

**Quarterly audit checklist:**
- [ ] Review all user roles
- [ ] Remove inactive users
- [ ] Audit admin access (should be 2-5 people)
- [ ] Check record sharing
- [ ] Review audit logs for unusual activity

### When to Promote a User

**Promote to Admin when:**
- User has been with company 3+ months
- User demonstrates responsibility
- User needs to manage other team members
- User is a department/team lead

**Promote to Owner only when:**
- User has founding role
- User is C-level executive
- User is leaving and needs handoff
- Organization explicitly approves

### When to Suspend vs. Remove Users

**Suspend (Don't Remove):**
- Temporary leave (vacation, medical)
- Investigation pending
- Access needs temporary removal
- User may return

**Remove (Permanent):**
- User left company
- Contract ended
- No expectation of return
- 30-day deletion grace period applies

### Onboarding New Users

**Step 1: Send Invite**
- Email invitation to user
- User creates account with link

**Step 2: Set Initial Role**
- Default: Member (can create/edit)
- Admin: For managers/leads
- Viewer: For observers

**Step 3: Grant Record Access**
- Share team projects
- Assign existing records
- Add as watcher on shared work

**Step 4: Follow Up**
- Check user is comfortable
- Answer permission questions
- Adjust access if needed

### Permission Change Workflow

When user changes roles/responsibility:

1. **Identify New Role**: Determine what access is needed
2. **Review Current Access**: Check what they currently have
3. **Remove Unnecessary**: Remove access no longer needed
4. **Add Necessary**: Add access for new role
5. **Document Change**: Note reason in audit log
6. **Notify User**: Tell them about changes
7. **Verify Access**: Confirm they can access needed data

---

## Troubleshooting

### User Can't See Records

**Diagnostics:**
1. Verify user role: Admin > Users > Check role
2. Check if record shared: Open record > Check "Shared With"
3. Check assignment: Is user assigned to the record?
4. Check team visibility: Is record team-visible or private?

**Solutions:**
- Share record with user (if private)
- Assign record to user (if applicable)
- Change record to team-visible
- Verify user role has permission (Member/Admin/Owner)

### User Has Too Much Access

**Audit access:**
1. Check user role - may be too high
2. Review shared records - too many?
3. Check team memberships - in wrong groups?
4. Review project access - should be removed?

**Reduce access:**
1. Lower user role if possible
2. Unshare unnecessary records
3. Remove from projects
4. Set records to private if appropriate

### Permission Changes Not Taking Effect

**Wait for refresh:**
- Cache may need clearing (1-2 minutes typically)
- Refresh browser page
- Log out and log back in
- Try different browser

**Check if change processed:**
- Admin > Audit Logs > Filter by user
- Verify permission change recorded
- If change not in logs, it didn't apply

---

## Multi-Organization Support

### Organization Isolation

- Users in Organization A cannot see Organization B data
- Data isolation enforced at database level
- No accidental cross-org data access
- Separate permission sets per organization

### Multi-Organization Users

Same user can have different roles in different organizations:
- Owner in Organization A
- Member in Organization B
- Viewer in Organization C

**Example:**
- Sarah is Owner of "Sales Company"
- Sarah is Admin of "Marketing Agency"
- Switch organizations: Users > Switch Organization

### Cross-Organization Considerations

- Separate audit logs per organization
- Separate settings per organization
- Team members list per organization
- Reports isolated by organization

---

## GDPR & Data Privacy

### Data Access Control

Permissions enforce GDPR requirements:
- Users see only organization data
- Users see only data relevant to role
- Audit logs track all access
- Admins can export user data

### Data Export Rights

Users can request export of their data:
1. Go to Settings > Privacy
2. Click "Export My Data"
3. Email sent with download link
4. Data includes all records they created/modified
5. Export valid for 7 days

### Data Deletion Rights

Users can request deletion:
1. Settings > Privacy > "Delete My Account"
2. 30-day grace period before deletion
3. Can cancel during grace period
4. After 30 days, permanently deleted
5. Deletion logged in audit trail

---

## Advanced: Custom Roles (Enterprise)

*Available on ENTERPRISE plan only*

Create custom roles with specific permissions:
1. Admin > Roles > Create New Role
2. Select base role (Admin, Member, Viewer)
3. Add/remove capabilities
4. Assign to users
5. Update anytime

**Example Custom Roles:**
- Sales Manager: Member + can delete own records + view all sales reports
- Finance: Viewer + can view invoices + export financial reports
- Support: Member + can only edit support tickets (not leads/accounts)

---

**Questions?** See [FAQ.md](FAQ.md) or contact support@nextcrm.io
