# Getting Started with NextCRM

**Estimated time to complete:** 15 minutes
**What you'll learn:** Account setup, core concepts, first steps, team invitations

Welcome to NextCRM! This guide will help you get up and running quickly. By the end, you'll have your profile set up, understand key concepts, and be ready to start managing your business relationships.

---

## Table of Contents

1. [What is NextCRM?](#what-is-nextcrm)
2. [Key Concepts](#key-concepts)
3. [Your First 5 Minutes Checklist](#your-first-5-minutes-checklist)
4. [Creating Your Account](#creating-your-account)
5. [Profile Setup](#profile-setup)
6. [Understanding Organizations](#understanding-organizations)
7. [Inviting Teammates](#inviting-teammates)
8. [Getting Help & Support](#getting-help--support)
9. [Common FAQs for New Users](#common-faqs-for-new-users)
10. [What's Next?](#whats-next)

---

## What is NextCRM?

NextCRM is a comprehensive Customer Relationship Management system designed to help you:

**Manage Customer Relationships**
- Track accounts, contacts, leads, and opportunities
- Monitor your sales pipeline
- Forecast revenue

**Organize Projects**
- Create Kanban boards for project management
- Assign tasks to team members
- Track progress with real-time collaboration

**Handle Finances**
- Create and manage invoices
- Track payments
- Use AI to extract invoice data automatically

**Store Documents**
- Centralized document storage
- Share files with your team
- Preview documents in-browser

**Integrate Email**
- Connect your email account
- Track opens and clicks
- Use templates for faster communication

NextCRM is built for teams of all sizes, from startups to enterprises. Whether you're a solo entrepreneur or managing a large sales organization, NextCRM adapts to your needs.

**Key Benefits:**
- All-in-one platform (no switching between tools)
- Multi-language support (English, German, Czech, Ukrainian)
- Modern, intuitive interface
- Role-based access control
- Secure and compliant

---

## Key Concepts

Before diving in, let's understand the main building blocks of NextCRM:

### Organizations

An **organization** is your workspace in NextCRM. It contains:
- All your data (accounts, contacts, leads, opportunities, projects, invoices)
- Team members (users)
- Settings and configurations

**Important:** Each organization's data is completely isolated. You can only see data from your own organization.

### Users & Roles

**Users** are people in your organization. Each user has a **role** that determines what they can do:

| Role | Description | Capabilities |
|------|-------------|--------------|
| **Owner** | Creator of organization | Full access, billing, delete organization |
| **Admin** | Administrator | Full access except billing and deletion |
| **Member** | Standard user | Create/edit records, collaborate |
| **Viewer** | Read-only user | View data only, no editing |

See the [Permissions Guide](./PERMISSIONS-GUIDE.md) for detailed role capabilities.

### CRM Entities

These are the core data types in the CRM module:

**Account**
- A company or organization you do business with
- Example: "Acme Corporation"

**Contact**
- A person within an account
- Example: "John Smith" (works at Acme Corporation)

**Lead**
- A potential customer who hasn't been qualified yet
- Example: "Jane Doe from Tech Startup Inc."

**Opportunity (Deal)**
- A potential sale with expected revenue
- Example: "$50,000 deal with Acme Corp - 80% probability"

**Relationship:** Lead → (qualified) → Account + Contact → Opportunity → (closed) → Won/Lost

### Projects & Tasks

**Board (Project)**
- A project workspace with Kanban-style task management
- Example: "Website Redesign Q4"

**Section**
- A column on the Kanban board
- Example: "To Do", "In Progress", "Done"

**Task**
- A unit of work within a project
- Can be assigned to users, have due dates, priorities

### Other Key Terms

**Watchers** - Users who get notified about changes to a record (even if not assigned)

**Assigned To** - The primary owner/responsible person for a record

**Pipeline** - The stages an opportunity moves through (e.g., Prospecting → Qualified → Closed)

**Invoice** - A bill for products/services rendered

**Document** - A file stored in NextCRM (PDF, image, spreadsheet, etc.)

---

## Your First 5 Minutes Checklist

Complete these steps to get started quickly:

- [ ] **1. Log in to NextCRM** (or create your account)
- [ ] **2. Set your profile photo** (Settings → Profile)
- [ ] **3. Choose your language** (English, German, Czech, or Ukrainian)
- [ ] **4. Set your timezone** (for correct date/time display)
- [ ] **5. Explore the navigation menu** (left sidebar on desktop)
- [ ] **6. Optional: Invite a teammate** (Settings → Team)

**Time:** 5 minutes
**Result:** You're ready to start using NextCRM!

---

## Creating Your Account

### Sign Up Methods

NextCRM supports three ways to create an account:

#### Method 1: Google OAuth (Recommended)

1. Go to the NextCRM sign-in page
2. Click **"Continue with Google"**
3. Select your Google account
4. Authorize NextCRM to access your email and profile
5. You're logged in!

**Benefits:**
- Fastest method (2 clicks)
- No password to remember
- Secure authentication via Google

#### Method 2: GitHub OAuth

1. Go to the NextCRM sign-in page
2. Click **"Continue with GitHub"**
3. Log in to GitHub if not already
4. Authorize NextCRM
5. You're logged in!

**Benefits:**
- Good for developers
- Single sign-on if you use GitHub regularly

#### Method 3: Email & Password

1. Go to the NextCRM sign-in page
2. Click **"Sign up"**
3. Enter your email address
4. Create a strong password (minimum 8 characters)
5. Click **"Create account"**
6. Check your email for verification (if required)
7. Log in with your credentials

**Benefits:**
- Works without external accounts
- Full control over credentials

### Account Status

After creating your account, you may be in one of these statuses:

**ACTIVE** ✅
- You can use NextCRM immediately
- Typical for demo.nextcrm.io deployments

**PENDING** ⏳
- Waiting for administrator approval
- Common for private NextCRM instances
- You'll receive an email when activated

**INACTIVE** ❌
- Account deactivated by administrator
- Contact your organization owner to reactivate

---

## Profile Setup

Let's personalize your account.

### Accessing Your Profile

1. Click your avatar/initials in the top-right corner
2. Select **"Profile"** from the dropdown menu

OR

- Navigate directly to: `/profile`

### Profile Photo

**Why it matters:** Your photo helps teammates identify you in task assignments, comments, and activity logs.

**To upload a photo:**

1. Go to your profile page
2. Click the circular avatar/initials placeholder
3. Click **"Upload photo"** or **"Change photo"**
4. Select an image from your computer
5. Adjust cropping if needed
6. Click **"Save"**

**Requirements:**
- Formats: JPG, PNG, GIF
- Max size: 5MB
- Recommended: Square image (at least 200x200 pixels)

### Basic Information

**Name**
- Your display name shown throughout NextCRM
- Can be different from your email
- Example: "Sarah Johnson" instead of "sjohnson@company.com"

**Email**
- Your login email (cannot be changed here)
- Used for notifications and password resets
- To change email, contact your administrator

**Username** (optional)
- Unique identifier
- Used for @mentions in comments

### Preferences

**Language**
- English (default)
- German (Deutsch)
- Czech (Čeština)
- Ukrainian (Українська)

Changes apply immediately to your interface.

**Timezone** (if supported)
- Ensures dates/times display correctly
- Important for due dates and scheduled tasks
- Example: "America/New_York", "Europe/London"

**Notifications** (if available)
- Email notifications for assigned tasks
- Reminders for due dates
- Comments on your records

### Changing Your Password

If you signed up with email/password:

1. Go to your profile
2. Click **"Change password"** or **"Security"** tab
3. Enter current password
4. Enter new password
5. Confirm new password
6. Click **"Update password"**

**Password requirements:**
- Minimum 8 characters
- Mix of letters and numbers recommended
- Avoid common passwords

**Forgot your password?**
- Click **"Forgot password?"** on the sign-in page
- Enter your email
- Check your email for reset link
- Create a new password

---

## Understanding Organizations

### What is an Organization?

When you create an account, NextCRM automatically creates your organization. Think of it as your company's workspace.

**Your organization contains:**
- All CRM data (accounts, contacts, leads, opportunities)
- Projects and tasks
- Invoices
- Documents
- Team members
- Settings and configurations

### Organization Plans

NextCRM offers three plans:

| Feature | FREE | PRO | ENTERPRISE |
|---------|------|-----|------------|
| Users | Up to 3 | Up to 10 | Unlimited |
| Storage | 1GB | 10GB | Unlimited |
| CRM Module | ✅ | ✅ | ✅ |
| Projects | ✅ | ✅ | ✅ |
| Invoices | ✅ | ✅ | ✅ |
| Documents | ✅ | ✅ | ✅ |
| Email Integration | ❌ | ✅ | ✅ |
| AI Features | Limited | ✅ | ✅ |
| API Access | ❌ | ✅ | ✅ |
| Support | Community | Priority | Dedicated |
| Price | $0/mo | $29/mo | Contact us |

**Your current plan:**
- View in Settings → Organization → Billing
- FREE plan is perfect for trying NextCRM
- Upgrade anytime as your team grows

### Single vs. Multiple Organizations

**Most users are in one organization** - your company.

**Multiple organizations:**
- Consultants managing multiple clients
- Agencies with separate workspaces per client
- Personal + business use cases

**Note:** Each organization is a separate workspace. You must switch between them (organization switcher in top menu).

---

## Inviting Teammates

NextCRM is built for collaboration. Let's add your team!

### Who Can Invite Users?

- **Owner:** Yes
- **Admin:** Yes
- **Member:** No (by default)
- **Viewer:** No

### How to Invite Teammates

1. **Navigate to Team Settings**
   - Click Settings icon in sidebar
   - Select **"Team"** or **"Users"**
   - OR go directly to: `/settings/team`

2. **Click "Invite Member"**

3. **Enter Email Address**
   - Type the teammate's work email
   - Example: john@company.com

4. **Choose a Role**
   - **Admin** - For managers who need full access
   - **Member** - For team members who will use CRM daily
   - **Viewer** - For stakeholders who only need read access

5. **Send Invitation**
   - Click **"Send Invite"**
   - The user receives an email invitation

6. **User Accepts**
   - They click the link in the email
   - Create their account (or log in)
   - They're automatically added to your organization

### Invitation Statuses

**PENDING** ⏳
- Invitation sent, not yet accepted
- Valid for 7 days
- Can be resent or cancelled

**ACCEPTED** ✅
- User has joined your organization
- Now appears in your team list

**EXPIRED** ❌
- Invitation link expired (after 7 days)
- Send a new invitation

**CANCELLED** 🚫
- You cancelled the invitation
- User cannot accept

### Managing Invitations

**View pending invitations:**
1. Settings → Team → Invitations tab
2. See all pending, expired, and accepted invitations

**Resend invitation:**
- Click **"Resend"** next to pending invitation
- User receives a new email with fresh link

**Cancel invitation:**
- Click **"Cancel"** next to pending invitation
- User can no longer accept

### User Approval Workflow

Depending on your NextCRM deployment:

**Option 1: Auto-activate** (demo.nextcrm.io)
- New users are ACTIVE immediately
- Can use NextCRM right away

**Option 2: Admin approval** (private instances)
- New users start as PENDING
- Administrator must activate them
- See [Admin Guide](./ADMIN-GUIDE.md) for activation steps

---

## Getting Help & Support

### In-App Help

**Question Mark Icons (?)**
- Throughout the interface
- Click for contextual help
- Explains the current page/feature

**Search (Ctrl+K / Cmd+K)**
- Global search across all records
- Find accounts, contacts, tasks, documents
- Supports filtering by type

### Documentation

**User Guides** (you are here!)
- [Getting Started](./GETTING_STARTED.md) - This guide
- [CRM Guide](./CRM-GUIDE.md) - Sales & pipeline management
- [Projects Guide](./PROJECTS-GUIDE.md) - Task management
- [Quick Start](./QUICK_START.md) - Quick reference

**Navigate:** Click "Help" or "Documentation" in the sidebar

### Support Channels

**Email Support**
- support@nextcrm.io
- Typical response: 24-48 hours (FREE plan)
- Priority: 4-8 hours (PRO/ENTERPRISE)

**System Status**
- Check if NextCRM is experiencing issues
- [status.nextcrm.io](#) (example URL)

**Community** (if available)
- Forums
- User groups
- Slack/Discord

### Before Contacting Support

1. Check [FAQ](./FAQ.md) - Common questions answered
2. Try [Troubleshooting Guide](./TROUBLESHOOTING.md) - Self-service debugging
3. Search documentation (Ctrl+F in guides)
4. Check your browser console for errors (if technical issue)

### What to Include in Support Requests

- **Description:** Clear explanation of the issue
- **Steps to reproduce:** What did you do?
- **Expected behavior:** What should happen?
- **Actual behavior:** What actually happened?
- **Browser:** Chrome, Firefox, Safari, etc.
- **Screenshots:** If applicable
- **User ID / Email:** For account-specific issues

---

## Common FAQs for New Users

### Account & Setup

**Q: I didn't receive my verification email. What should I do?**

A: Check your spam/junk folder. If still not there:
1. Wait 5 minutes (email can be delayed)
2. Request a new verification email
3. Check that you entered the correct email address
4. Contact support if issue persists

**Q: Can I change my email address?**

A: Yes, but you need administrator help. Contact your organization owner or NextCRM support.

**Q: I signed up with Google/GitHub. How do I set a password?**

A: You don't need a password if using OAuth. However, you can add one:
1. Profile → Security → Add Password
2. Enables signing in with email/password as backup

**Q: Can I belong to multiple organizations?**

A: Yes! You can be a member of multiple organizations. Use the organization switcher in the top menu to switch between them.

### Getting Started

**Q: What should I do first?**

A: Follow this order:
1. Complete profile setup (5 min)
2. Explore the CRM module - create a test account (5 min)
3. Create a test project board (5 min)
4. Invite your first teammate (3 min)
5. Read the [CRM Guide](./CRM-GUIDE.md) or [Projects Guide](./PROJECTS-GUIDE.md) based on your role

**Q: Is there a demo or sample data?**

A: Some NextCRM deployments include sample data for exploration. Check:
- CRM → Accounts (look for "Demo" or "Example" accounts)
- Projects → Boards (look for sample project)

If no sample data, you can:
- Create your own test data
- Import real data from CSV
- Ask support for sample data import

**Q: Where do I find keyboard shortcuts?**

A: See the [Quick Start Guide](./QUICK_START.md#keyboard-shortcuts) for a complete list.

**Q: How do I change the interface language?**

A: Profile → Preferences → Language → Select your language

Supported languages:
- English
- German (Deutsch)
- Czech (Čeština)
- Ukrainian (Українська)

### Team & Collaboration

**Q: How many users can I invite?**

A: Depends on your plan:
- FREE: 3 users total
- PRO: 10 users total
- ENTERPRISE: Unlimited

**Q: What's the difference between "Assigned To" and "Watchers"?**

A:
- **Assigned To:** The primary owner/responsible person
- **Watchers:** Additional people who get notifications about changes (even if not assigned)

Example: A sales opportunity is assigned to Sarah (sales rep), but Tom (sales manager) is a watcher to stay informed.

**Q: Can I see who else is online?**

A: Not currently. Active session tracking is available to administrators via audit logs.

### Data & Privacy

**Q: Where is my data stored?**

A: Data is stored in MongoDB databases. Location depends on your deployment:
- Hosted NextCRM: Secure cloud servers
- Self-hosted: Your own infrastructure

**Q: Who can see my data?**

A: Only users within your organization. Data is completely isolated per organization. Even NextCRM administrators cannot access your data (unless you request support).

**Q: Can I export my data?**

A: Yes! Owners and Admins can export all organization data:
1. Settings → Organization → Data Export
2. Click "Request Export"
3. Receive download link via email (valid 7 days)
4. Download JSON file with all your data

See [Admin Guide](./ADMIN-GUIDE.md#data-export) for details.

**Q: Is NextCRM GDPR compliant?**

A: Yes. NextCRM includes features for GDPR compliance:
- Data export (user right to access)
- Data deletion (right to erasure)
- Audit logs (accountability)
- Consent tracking (if applicable)

Contact support for detailed compliance information.

### Billing & Plans

**Q: How does the FREE plan work?**

A: The FREE plan includes:
- 3 users
- 1GB storage
- Core features (CRM, Projects, Invoices, Documents)
- No time limit - use forever!

**Q: When am I charged?**

A:
- FREE plan: Never
- PRO plan: Monthly or annual billing, starting when you upgrade
- ENTERPRISE: Custom billing (contact sales)

**Q: Can I upgrade/downgrade my plan?**

A: Yes, anytime:
1. Settings → Organization → Billing
2. Click "Change Plan"
3. Select new plan
4. Confirm changes

Billing is prorated automatically.

---

## What's Next?

Congratulations! You've completed the Getting Started guide. You now have your account set up and understand the basics of NextCRM.

### Recommended Next Steps

**For Sales Teams:**
→ [Read the CRM Guide](./CRM-GUIDE.md)
- Learn to manage accounts, leads, contacts, opportunities
- Understand the sales pipeline
- Forecast revenue

**For Project Managers:**
→ [Read the Projects Guide](./PROJECTS-GUIDE.md)
- Create Kanban boards
- Assign tasks to team members
- Use AI features

**For Finance Teams:**
→ [Read the Invoices Guide](./INVOICES-GUIDE.md)
- Create and track invoices
- Use AI invoice data extraction
- Generate reports

**For Administrators:**
→ [Read the Admin Guide](./ADMIN-GUIDE.md)
- Manage users and roles
- Configure organization settings
- Review audit logs

**For Everyone:**
→ [Quick Start Reference](./QUICK_START.md)
- Keyboard shortcuts
- Common workflows
- Quick tips

### Keep Learning

- **Explore modules** - Click around and experiment (you can't break anything!)
- **Import real data** - Start with CSV import for accounts/contacts
- **Create a test project** - Get comfortable with Kanban boards
- **Invite your team** - Collaboration is where NextCRM shines
- **Ask questions** - Check FAQ and Troubleshooting guides

---

## Quick Reference Card

Print or bookmark this for quick access:

### Access NextCRM
- Web: `https://your-nextcrm-url.com`
- Login: Email/password or OAuth (Google/GitHub)

### Profile
- Access: Avatar (top-right) → Profile
- Upload photo, set language, change password

### Invite Team
- Access: Settings → Team → Invite Member
- Choose role: Owner, Admin, Member, Viewer

### Get Help
- In-app: ? icons
- Search: Ctrl+K / Cmd+K
- Support: support@nextcrm.io
- Docs: [user-guides](./README.md)

### Key Shortcuts
- Search: `Ctrl/Cmd + K`
- Settings: `Ctrl/Cmd + ,`

### Plans
- FREE: 3 users, 1GB storage
- PRO: 10 users, 10GB storage
- ENTERPRISE: Unlimited

---

**Ready to dive deeper?** Choose your learning path in the [main documentation index](./README.md).

**Questions?** Check the [FAQ](./FAQ.md) or [contact support](#getting-help--support).
