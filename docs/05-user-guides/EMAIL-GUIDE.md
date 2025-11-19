# Email Guide

## Overview

The Email module in NextCRM integrates your email directly into your CRM, eliminating the need to switch between multiple applications. Connect Gmail, Outlook, Office 365, or any IMAP/SMTP email provider to view, send, and track emails alongside your customer data. Emails automatically link to contacts, leads, and accounts, providing complete communication context at a glance.

### Why Integrate Email with NextCRM?

**Unified Communication History**: See all email conversations with a customer directly on their account, contact, or lead page. No more searching through email folders to find that critical message from six months ago.

**Automatic Linking**: NextCRM automatically associates incoming and outgoing emails with the correct CRM records based on email addresses. Manual linking is available for edge cases.

**Email Tracking**: Know when recipients open your emails and click links. Prioritize follow-ups based on engagement data.

**Templates & Merge Fields**: Create reusable email templates with merge fields that automatically populate customer data (name, company, deal amount, etc.). Send personalized emails at scale.

**Team Visibility**: When properly configured, your entire team can see email communications with customers, ensuring continuity when team members are out or accounts transition between salespeople.

### Supported Email Providers

NextCRM supports these providers with native OAuth integration (no password required):

- **Gmail / Google Workspace** (recommended)
- **Outlook.com / Office 365** (recommended)

NextCRM also supports any email provider that offers IMAP/SMTP access:

- **Microsoft Exchange Server**
- **Yahoo Mail**
- **ProtonMail Bridge**
- **Zoho Mail**
- **FastMail**
- **Custom IMAP/SMTP servers**

**Security Note**: OAuth providers (Gmail, Outlook) are more secure because NextCRM never stores your email password. For IMAP/SMTP providers, credentials are encrypted using AES-256 before storage.

---

## Email Account Setup

### Gmail / Google Workspace Setup

The easiest and most secure method:

**Prerequisites:**
- Active Gmail or Google Workspace account
- Admin access if using Google Workspace (to enable OAuth)

**Step-by-Step Setup:**

1. Navigate to **Settings** → **Email Integration**
2. Click **Connect Email Account**
3. Select **Gmail**
4. Click **Connect with Google**
5. Google OAuth consent screen appears:
   - Select your Google account
   - Review permissions:
     - Read, compose, send, and delete emails
     - Manage labels
     - See email settings
   - Click **Allow**
6. You're redirected back to NextCRM
7. Configure sync settings:
   - **Sync From Date**: Choose how far back to sync (1 month, 3 months, 6 months, 1 year, or all)
   - **Sync Frequency**: Every 5 minutes, 15 minutes, 30 minutes, or 1 hour
   - **Auto-Link Emails**: Enable to automatically link emails to CRM records (recommended)
   - **Sync Sent Items**: Include your sent emails in sync
8. Click **Save Settings**

Initial sync begins immediately. Depending on email volume, first sync can take 10-60 minutes.

**Google Workspace Admin Configuration:**

If you're a Google Workspace admin and want to enable this for all users:

1. Go to Google Admin Console → Security → API Controls
2. Add NextCRM to trusted apps:
   - App name: NextCRM
   - Client ID: `[provided by NextCRM support]`
3. Configure organizational unit access
4. Save

This pre-approves NextCRM for all users in your organization, simplifying the connection process.

**Troubleshooting Gmail Connection:**

**"Access Blocked" Error:**
- Your Google Workspace admin has restricted third-party apps
- Contact your IT admin to whitelist NextCRM

**"Permission Denied" Error:**
- You clicked "Deny" during OAuth consent
- Restart the connection process and click "Allow"

**Emails Not Syncing:**
- Check **Settings** → **Email Integration** → **Sync Status**
- Look for error messages (quota exceeded, authentication expired)
- Try **Re-authenticate** button to refresh OAuth token

### Outlook / Office 365 Setup

Similar OAuth process for Microsoft accounts:

**Prerequisites:**
- Active Outlook.com or Office 365 account
- Admin consent (if using Office 365 business account)

**Step-by-Step Setup:**

1. Navigate to **Settings** → **Email Integration**
2. Click **Connect Email Account**
3. Select **Outlook / Office 365**
4. Click **Connect with Microsoft**
5. Microsoft login screen appears:
   - Sign in with your Microsoft account
   - Review permissions:
     - Read and write access to mail
     - Read user profile
     - Offline access
   - Click **Accept**
6. Redirected back to NextCRM
7. Configure sync settings (same as Gmail)
8. Click **Save Settings**

**Office 365 Admin Configuration:**

For Office 365 business/enterprise accounts:

1. Go to Azure Portal → App registrations
2. Find NextCRM app (or register it):
   - Redirect URI: `https://app.nextcrm.io/api/auth/microsoft/callback`
   - Required permissions: Mail.ReadWrite, Mail.Send, User.Read
3. Grant admin consent for your organization
4. Provide tenant ID to users for simplified connection

**Troubleshooting Outlook Connection:**

**"Admin Approval Required" Error:**
- Your Office 365 admin must grant consent
- Forward this guide to your IT admin

**"Invalid Redirect URI" Error:**
- Contact NextCRM support (configuration issue on Microsoft side)

**Sync Stuck at "Initializing":**
- Microsoft Graph API may be experiencing delays
- Wait 30 minutes and check again
- If still stuck, click **Re-authenticate**

### Exchange Server Setup

For self-hosted or corporate Exchange servers:

**Prerequisites:**
- Exchange Server 2013 or newer (2016+ recommended)
- EWS (Exchange Web Services) enabled
- Exchange account credentials
- Exchange server URL (usually `https://mail.yourcompany.com/EWS/Exchange.asmx`)

**Step-by-Step Setup:**

1. Navigate to **Settings** → **Email Integration**
2. Click **Connect Email Account**
3. Select **Exchange Server**
4. Fill in connection details:
   - **Email Address**: your.name@company.com
   - **Exchange Server URL**: https://mail.company.com/EWS/Exchange.asmx
   - **Username**: Usually email address or domain\username
   - **Password**: Your Exchange password
   - **Domain**: Your Active Directory domain (if applicable)
5. Click **Test Connection**
   - NextCRM verifies credentials
   - Checks EWS endpoint accessibility
   - Validates permissions
6. If test succeeds, configure sync settings
7. Click **Save Settings**

**Finding Your Exchange Server URL:**

Don't know your Exchange server URL? Try:

1. Open Outlook desktop client
2. Hold Ctrl and right-click Outlook icon in system tray
3. Select **Connection Status**
4. Look for **Server** column (shows server URL)

Or ask your IT administrator.

**Exchange Permissions Required:**

Your Exchange account must have these permissions:
- Full access to mailbox
- Send As
- Calendar access (optional, for meeting scheduling)

**Troubleshooting Exchange Connection:**

**"Connection Timeout" Error:**
- Exchange server may not be accessible from internet
- VPN required, or server is internal-only
- Contact IT administrator

**"Authentication Failed" Error:**
- Incorrect username/password
- Account may require domain prefix (DOMAIN\username)
- 2FA may be blocking access (generate app-specific password)

**"EWS Disabled" Error:**
- Exchange Web Services disabled on server
- Contact IT administrator to enable

### IMAP/SMTP Generic Setup

For other email providers (Yahoo, ProtonMail, Zoho, etc.):

**Prerequisites:**
- IMAP and SMTP access enabled on your email account
- Server addresses and port numbers
- App-specific password (if 2FA is enabled)

**Step-by-Step Setup:**

1. Navigate to **Settings** → **Email Integration**
2. Click **Connect Email Account**
3. Select **Other (IMAP/SMTP)**
4. Fill in IMAP settings (for receiving):
   - **IMAP Server**: imap.provider.com
   - **IMAP Port**: Usually 993 (SSL) or 143 (STARTTLS)
   - **Encryption**: SSL/TLS (recommended) or STARTTLS
   - **Username**: Usually your full email address
   - **Password**: Your email password or app-specific password
5. Fill in SMTP settings (for sending):
   - **SMTP Server**: smtp.provider.com
   - **SMTP Port**: Usually 465 (SSL) or 587 (STARTTLS)
   - **Encryption**: SSL/TLS (recommended) or STARTTLS
   - **Username**: Usually same as IMAP username
   - **Password**: Usually same as IMAP password
6. Click **Test Connection**
7. Configure sync settings
8. Click **Save Settings**

**Common Provider Settings:**

**Yahoo Mail:**
- IMAP: imap.mail.yahoo.com, Port 993, SSL
- SMTP: smtp.mail.yahoo.com, Port 465, SSL
- Requires app-specific password (Yahoo calls it "app password")

**ProtonMail Bridge:**
- Requires ProtonMail Bridge desktop app running
- IMAP: 127.0.0.1, Port 1143, STARTTLS
- SMTP: 127.0.0.1, Port 1025, STARTTLS
- Username/password provided by Bridge app

**Zoho Mail:**
- IMAP: imap.zoho.com, Port 993, SSL
- SMTP: smtp.zoho.com, Port 465, SSL
- Use full email address as username

**FastMail:**
- IMAP: imap.fastmail.com, Port 993, SSL
- SMTP: smtp.fastmail.com, Port 465, SSL
- Requires app-specific password

**Troubleshooting IMAP/SMTP Connection:**

**"Authentication Failed" Error:**
- Verify username and password are correct
- If 2FA is enabled, use app-specific password (not your regular password)
- Some providers require "less secure app access" enabled

**"SSL Certificate Error:"**
- Try switching encryption from SSL to STARTTLS (or vice versa)
- Ensure port number matches encryption type

**"Connection Refused" Error:**
- IMAP/SMTP may be disabled on your account
- Check provider's settings page to enable
- Some free accounts don't support IMAP/SMTP

**Emails Sending But Not Receiving:**
- SMTP works but IMAP doesn't
- Check IMAP is enabled
- Verify IMAP credentials separately from SMTP

---

## Email Features & Auto-Linking

### Viewing Emails in NextCRM

Once connected, access emails in multiple ways:

**Email Inbox:**

1. Click **Emails** in main navigation
2. View your complete inbox with:
   - From/To addresses
   - Subject line
   - Preview snippet (first 100 characters)
   - Date/time
   - Attachment indicator
   - Read/unread status
   - CRM link status (shows which record it's linked to)

**Filters:**
- Unread only
- With attachments
- Sent by me
- Received today / this week / this month
- Linked to CRM / not linked
- Specific folder/label

**Email Folders:**

Your email provider's folder structure syncs to NextCRM:
- Inbox
- Sent Items
- Drafts
- Custom folders/labels

Navigate between folders using the left sidebar.

**Threading:**

Emails are automatically grouped into conversations (threads). Click a thread to expand and see all messages in chronological order.

### Automatic Email Linking

NextCRM intelligently links emails to CRM records:

**How Auto-Linking Works:**

1. Email arrives in your inbox (or you send an email)
2. NextCRM examines sender/recipient email addresses
3. Searches for matching Contact, Lead, or Account records
4. Automatically creates association link
5. Email appears on the associated record's page

**Linking Priority:**

When multiple matches are possible, NextCRM uses this priority:

1. **Contact**: If sender's email matches a Contact's email field
2. **Lead**: If sender's email matches a Lead's email field
3. **Account**: If sender's email domain matches an Account's domain

**Example:**

Email from: john.smith@acmecorp.com

- NextCRM searches for Contact with email "john.smith@acmecorp.com"
- If found, links to that Contact (and their associated Account)
- If not found, searches for Lead with that email
- If not found, searches for Account with domain "acmecorp.com"
- If still not found, email remains unlinked (but viewable in inbox)

**Viewing Linked Emails:**

1. Open any Account, Contact, or Lead page
2. Scroll to **Email History** section
3. See all emails linked to this record:
   - Chronological order (most recent first)
   - Sent and received emails
   - Subject lines (click to view full email)
   - Date/time
4. Click any email to view complete content, attachments, and full thread

**Pro Tip**: Keep your CRM data up-to-date with accurate email addresses. Auto-linking only works when email addresses in CRM match those in actual emails.

### Manual Email Linking

For emails that don't auto-link:

**Link from Email View:**

1. Open the unlinked email in **Emails** inbox
2. Click **Link to CRM** button (top right)
3. Search for and select:
   - Account, Contact, Lead, or Opportunity
4. Click **Link**
5. Email now appears on that record's page

**Link from CRM Record:**

1. Open an Account, Contact, or Lead page
2. Scroll to **Email History** section
3. Click **Link Existing Email**
4. Search emails by subject, sender, or date
5. Select email(s) to link
6. Click **Link Selected**

**Bulk Linking:**

Link multiple emails at once:

1. Go to **Emails** inbox
2. Select multiple unlinked emails (checkboxes)
3. Click **Actions** → **Bulk Link**
4. Select destination record
5. Click **Link All**

**Unlinking Emails:**

Remove incorrect links:

1. Open the linked email
2. Click **Unlink from [Record Name]**
3. Confirm unlinking
4. Email returns to unlinked status (still in inbox)

### Email Threading & Conversations

NextCRM groups related emails into conversations:

**Thread Detection:**

Emails are grouped when they share:
- Same subject line (ignoring "Re:" and "Fwd:" prefixes)
- References header (technical email header that links replies)
- In-Reply-To header

**Viewing Threads:**

1. Click on any email in the inbox
2. If it's part of a thread, you'll see **Show Full Thread** button
3. Click to expand entire conversation
4. Messages appear in chronological order
5. Your messages are highlighted in blue
6. Their messages in white

**Thread Metadata:**

For each thread, see:
- Total message count
- Participants (all senders/recipients)
- Date of first and last message
- Number of attachments
- CRM record associations

**Breaking Threads:**

If NextCRM incorrectly groups emails:

1. Open the thread
2. Click **Thread Actions** → **Split Thread**
3. Select which messages to split into a new thread
4. Click **Split**

### Email Search

Powerful search across all emails:

**Quick Search:**

Type in the search box at top of Emails page:
- Searches subject lines, sender, recipient, and body content
- Results appear instantly (live search)
- Highlights matching terms

**Advanced Search:**

Click **Advanced Search** to use filters:

**By Sender/Recipient:**
- From: specific email address or domain
- To: specific email address
- CC: specific email address

**By Date:**
- Sent after [date]
- Sent before [date]
- Date range [start] to [end]

**By Content:**
- Subject contains [keyword]
- Body contains [keyword]
- Has attachments (yes/no)
- Attachment name contains [keyword]

**By Status:**
- Read / Unread
- Flagged / Unflagged
- Linked to CRM / Not linked
- Has replies / No replies

**By Association:**
- Linked to specific Account
- Linked to specific Contact
- Linked to specific Lead
- Linked to specific Opportunity

**Search Operators:**

Use advanced operators for precise searches:

```
from:john@acme.com subject:"proposal"
```
Finds emails from john@acme.com with "proposal" in subject.

```
has:attachment to:me
```
Finds emails with attachments sent to you.

```
after:2024-01-01 before:2024-03-31 from:*@acme.com
```
Finds emails from anyone at acme.com in Q1 2024.

```
subject:(contract OR agreement) has:attachment
```
Finds emails with "contract" or "agreement" in subject that have attachments.

**Saved Searches:**

Save frequently used searches:

1. Perform a search with your desired criteria
2. Click **Save This Search**
3. Name it (e.g., "Unlinked Client Emails")
4. Search appears in sidebar under **Saved Searches**
5. Click to instantly rerun

---

## Email Tracking

### Open Tracking

Know when recipients open your emails:

**How Open Tracking Works:**

1. You compose and send an email from NextCRM
2. NextCRM embeds a tiny (1x1 pixel) invisible tracking image
3. When recipient opens email, their email client loads the image
4. NextCRM receives notification and logs the open event
5. You see open notification in NextCRM

**Accuracy: ~95%** (some email clients block tracking images)

**Viewing Open Status:**

**In Email List:**
- Eye icon appears next to emails that have been opened
- Hover over icon to see:
  - Number of opens
  - First open date/time
  - Most recent open date/time

**In Email Detail:**
- Open **Tracking Details** section
- View complete open history:
  - Each open event timestamp
  - IP address (approximate location)
  - Device type (desktop, mobile, tablet)
  - Email client (Gmail, Outlook, Apple Mail, etc.)

**Open Notifications:**

Enable real-time notifications:

1. Go to **Settings** → **Email Settings** → **Tracking**
2. Enable **Open Notifications**
3. Choose notification method:
   - Desktop notification (browser popup)
   - Email notification
   - Both
4. Set notification threshold (notify on first open only, or every open)
5. Save

When someone opens your email, you'll receive instant notification.

**Pro Tip**: Use open tracking to time your follow-ups. If a prospect opens your proposal 5 times in one day, they're seriously considering it—perfect time for a follow-up call.

**Privacy & Compliance:**

Open tracking complies with email privacy laws when:
- You inform recipients in your email signature or privacy policy
- You don't track EU recipients without GDPR consent (if applicable)

NextCRM includes an option to auto-disable tracking for emails to EU domains.

### Link Tracking

Track which links recipients click:

**How Link Tracking Works:**

1. You compose email with links (e.g., to proposal, product page, pricing)
2. Enable link tracking before sending
3. NextCRM replaces links with tracking URLs (redirects through NextCRM)
4. When recipient clicks, they're redirected through NextCRM
5. NextCRM logs the click and redirects to destination URL
6. You see click notification

**Enabling Link Tracking:**

When composing an email:
1. Add your links to the email body
2. Enable **Track Links** checkbox (above Send button)
3. Optionally customize which links to track (Advanced)
4. Send email

All links in your email are now tracked.

**Viewing Click Data:**

**In Email Detail:**
- Open **Tracking Details** section
- View link click history:
  - Which link was clicked
  - Number of clicks per link
  - Click timestamps
  - IP address and location
  - Device and browser

**Click Notifications:**

Enable notifications for link clicks:

1. Go to **Settings** → **Email Settings** → **Tracking**
2. Enable **Link Click Notifications**
3. Choose notification method
4. Save

You'll receive instant notification when anyone clicks a tracked link.

**Pro Tip**: Use link tracking to gauge interest. If a prospect clicks your pricing page link 3 times, they're evaluating cost—a warm lead for your sales team.

**Link Tracking Best Practices:**

- Track important links only (call-to-action, proposals, pricing)
- Don't track every link (privacy concern, can look spammy)
- Use descriptive link text ("View Proposal" not "Click Here") so tracking data is meaningful

### Reply Detection

Automatically detect and log email replies:

**How Reply Detection Works:**

1. You send an email from NextCRM
2. Recipient replies
3. Reply arrives in your connected email inbox
4. NextCRM's sync process detects it's a reply (using email headers)
5. Reply is automatically linked to original email (threading)
6. You're notified

**Reply Notifications:**

Enable notifications for replies:

1. Go to **Settings** → **Email Settings** → **Notifications**
2. Enable **Reply Notifications**
3. Choose method (desktop, email, both)
4. Set priority filter (all replies, or only from important contacts)
5. Save

**Reply Speed Tracking:**

For each sent email, NextCRM tracks:
- Time to first reply (how long before recipient responded)
- Average reply time for this contact (historical average)
- Reply rate percentage (% of your emails they reply to)

View this data:
1. Open any sent email
2. Go to **Tracking Details** → **Reply Statistics**
3. See reply metrics

**Pro Tip**: Monitor reply times to gauge engagement. Contacts who consistently reply within 1 hour are highly engaged. Those who take days or never reply may need different outreach strategies.

### Tracking Statistics Dashboard

View aggregate tracking data:

1. Go to **Emails** → **Tracking Dashboard**
2. View overall statistics:
   - **Total Emails Sent**: From NextCRM
   - **Open Rate**: % of emails opened at least once
   - **Click Rate**: % of emails with at least one link click
   - **Reply Rate**: % of emails that received replies
   - **Bounce Rate**: % of emails that bounced
3. Filter by date range (last 7 days, 30 days, 90 days, custom)
4. Drill down by:
   - Sender (team member)
   - Recipient (account, contact, lead)
   - Template (if using email templates)
   - Campaign (if using email campaigns)

**Benchmark Statistics:**

NextCRM displays industry benchmarks next to your statistics:
- Average email open rate: 20-25%
- Average click rate: 2-5%
- Average reply rate: 8-12%

Compare your performance to benchmarks to identify improvement opportunities.

**Pro Tip**: Low open rates? Improve your subject lines. Low click rates? Improve your call-to-action. Low reply rates? Personalize your emails more.

### Client Limitations & Accuracy

**Tracking limitations with certain email clients:**

**Gmail Web (gmail.com):**
- Open tracking: Works reliably
- Link tracking: Works reliably
- Limitation: Images must be set to "always display" (most users have this)

**Outlook (Desktop & Web):**
- Open tracking: Works reliably
- Link tracking: Works reliably
- Limitation: Outlook blocks external images by default (user must click "download images")

**Apple Mail (iOS & macOS):**
- Open tracking: Partially works
- Link tracking: Works reliably
- Limitation: Apple's Mail Privacy Protection (iOS 15+) pre-loads tracking pixels, causing false opens

**Thunderbird:**
- Open tracking: Works if user enables remote content
- Link tracking: Works reliably

**ProtonMail:**
- Open tracking: Often blocked (privacy-focused)
- Link tracking: Works reliably

**Accuracy Notes:**

- **False Positives**: Apple Mail Privacy Protection pre-loads images, registering an "open" even if user never actually views the email
- **False Negatives**: Some corporate email gateways strip tracking pixels, preventing open detection even when email is genuinely opened
- **Link Tracking More Reliable**: Link clicks are generally more accurate than opens (harder to block or falsify)

**Best Practice**: Use tracking data as indicators, not absolutes. A lack of open notification doesn't mean the email wasn't read.

### Privacy Considerations

**Ethical Use of Tracking:**

- Be transparent: Mention in your email signature or privacy policy that emails may contain tracking
- Respect privacy: Don't use tracking data for unrelated purposes
- Provide opt-out: Allow recipients to request non-tracked emails

**GDPR Compliance:**

If you email EU recipients:
- Open/click tracking may require consent (consult legal counsel)
- Option: Disable tracking for EU domains automatically (available in Settings)
- Provide data access/deletion upon request

**NextCRM Privacy Settings:**

1. Go to **Settings** → **Email Settings** → **Privacy**
2. Configure:
   - **Disable Tracking for EU Domains**: Automatically disable for .eu, .de, .fr, etc.
   - **Include Privacy Notice**: Auto-add privacy notice to email signatures
   - **Allow Recipient Opt-Out**: Include unsubscribe link
3. Save

---

## Email Templates & Merge Fields

### Using Email Templates

Save time with reusable email templates:

**Accessing Templates:**

1. Click **Emails** → **Templates** (left sidebar)
2. View library of templates:
   - Personal templates (created by you)
   - Team templates (shared by your team)
   - Company templates (created by admins)

**Using a Template:**

1. Click **Compose** to start new email
2. Click **Templates** dropdown (above subject line)
3. Browse or search templates
4. Click template name to insert it
5. Template populates:
   - Subject line (if template includes it)
   - Email body
   - Merge fields are automatically replaced with recipient data
6. Customize as needed
7. Send

**Pro Tip**: Templates with merge fields save the most time. Instead of manually typing each recipient's name and company, merge fields auto-populate from CRM data.

### Template Library

NextCRM includes 50+ pre-built templates:

**Sales Templates:**
- Initial Outreach
- Follow-Up After Meeting
- Quote/Proposal Send
- Check-In (No Response)
- Contract Send
- Closing the Deal
- Upsell/Cross-Sell

**Customer Success:**
- Welcome Email
- Onboarding Steps
- Training Invitation
- Feature Announcement
- Feedback Request
- Renewal Reminder

**Support:**
- Ticket Received Confirmation
- Issue Resolved
- Escalation Notification
- Follow-Up After Resolution

**General:**
- Meeting Request
- Thank You
- Introduction/Referral
- Event Invitation
- Newsletter

**Customizing Pre-Built Templates:**

1. Go to **Emails** → **Templates**
2. Find pre-built template
3. Click **Duplicate** (you can't edit pre-built templates directly)
4. Edit the duplicated copy
5. Save as personal or team template

### Creating Custom Templates

Build templates for your specific needs:

**Creating a New Template:**

1. Go to **Emails** → **Templates**
2. Click **New Template**
3. Fill in template details:
   - **Template Name**: Internal name (e.g., "Q1 Follow-Up")
   - **Subject Line**: Optional (can include merge fields)
   - **Email Body**: Your email content
   - **Category**: Sales, Support, Marketing, etc.
   - **Visibility**: Personal, Team, or Company
4. Insert merge fields (see next section)
5. Add formatting (bold, italic, lists, links, images)
6. Click **Save Template**

**Template Editor Features:**

- Rich text formatting (bold, italic, underline, font size, colors)
- Bullet and numbered lists
- Links and buttons
- Images (upload or URL)
- Tables
- Horizontal dividers
- Code blocks
- Signature blocks

**Template Variables:**

Beyond merge fields, use variables for dynamic content:

**Date/Time Variables:**
- `{{currentDate}}` - Today's date (formatted per your locale)
- `{{currentTime}}` - Current time
- `{{currentYear}}` - Current year

**Sender Variables:**
- `{{senderName}}` - Your full name
- `{{senderEmail}}` - Your email address
- `{{senderPhone}}` - Your phone number (from profile)
- `{{senderTitle}}` - Your job title

**Conditional Content:**

Show/hide content based on data:

```
{{#if accountType == "Enterprise"}}
Thank you for being an Enterprise customer. Your dedicated account manager is {{accountManager}}.
{{else}}
Thank you for being a valued customer. Contact support anytime at support@company.com.
{{/if}}
```

**Pro Tip**: Create a "template library document" that lists all available merge fields and variables for your team. Store it in your Documents module for easy reference.

### Merge Fields

Automatically populate recipient data:

**Available Merge Fields:**

**Contact Fields:**
- `{{firstName}}` - Contact's first name
- `{{lastName}}` - Contact's last name
- `{{fullName}}` - Contact's full name
- `{{email}}` - Contact's email address
- `{{phone}}` - Contact's phone number
- `{{jobTitle}}` - Contact's job title
- `{{mobile}}` - Contact's mobile phone

**Account Fields:**
- `{{company}}` or `{{accountName}}` - Account/company name
- `{{accountIndustry}}` - Account's industry
- `{{accountWebsite}}` - Account's website
- `{{accountPhone}}` - Account's phone number
- `{{accountAddress}}` - Full address
- `{{accountCity}}`, `{{accountState}}`, `{{accountZip}}`

**Lead Fields:**
- `{{leadName}}` - Lead's full name
- `{{leadEmail}}` - Lead's email
- `{{leadCompany}}` - Lead's company
- `{{leadStatus}}` - Lead status (NEW, CONTACTED, etc.)
- `{{leadSource}}` - Where lead came from

**Opportunity Fields:**
- `{{opportunityName}}` - Opportunity title
- `{{opportunityAmount}}` - Deal value (formatted currency)
- `{{opportunityStage}}` - Current stage
- `{{opportunityCloseDate}}` - Expected close date

**Custom Fields:**
- Any custom field you've added to CRM: `{{customField_fieldName}}`

**Using Merge Fields:**

1. While composing or editing template, position cursor where you want data inserted
2. Click **Insert Merge Field** button (toolbar)
3. Browse categories and select field
4. Field placeholder is inserted: `{{firstName}}`
5. Continue composing

When email is sent, merge fields are replaced with actual data:

**Template:**
```
Hi {{firstName}},

I hope this email finds you well. I wanted to follow up on our conversation about {{opportunityName}}.

As discussed, the investment would be {{opportunityAmount}}, with expected implementation by {{opportunityCloseDate}}.

Looking forward to your feedback!

Best regards,
{{senderName}}
```

**Actual Email (after merge):**
```
Hi John,

I hope this email finds you well. I wanted to follow up on our conversation about Website Redesign Project.

As discussed, the investment would be $45,000, with expected implementation by April 15, 2024.

Looking forward to your feedback!

Best regards,
Sarah Johnson
```

**Fallback Values:**

If a merge field has no data, you can provide fallback:

```
Hi {{firstName || "there"}},
```

If `firstName` is empty, "there" is used instead: "Hi there,"

**Pro Tip**: Always preview before sending. Click **Preview** in compose window to see how merge fields will render with actual recipient data.

### Template Performance Analytics

Track which templates perform best:

1. Go to **Emails** → **Templates** → **Analytics**
2. View metrics for each template:
   - **Usage Count**: How many times sent
   - **Open Rate**: % of emails opened
   - **Click Rate**: % of emails clicked
   - **Reply Rate**: % of emails replied to
   - **Average Response Time**: How quickly recipients respond
3. Sort by any metric (e.g., highest open rate)
4. Identify top-performing templates

**A/B Testing Templates:**

Test variations to optimize performance:

1. Create two versions of a template (e.g., different subject lines)
2. Use **A/B Test** feature:
   - Specify percentage split (50/50 or 70/30, etc.)
   - Choose success metric (open rate, reply rate, etc.)
   - Set test duration (7 days, 14 days, etc.)
3. NextCRM automatically sends versions according to split
4. After test period, view results
5. Promote winning version as primary template

**Pro Tip**: Test one element at a time (subject line OR email body, not both simultaneously) to isolate what causes performance differences.

---

## Email Automation

### Scheduled Sending

Send emails at optimal times:

**Scheduling an Email:**

1. Compose your email
2. Instead of clicking **Send**, click dropdown arrow next to Send button
3. Select **Schedule Send**
4. Choose when to send:
   - **Tomorrow morning** (8 AM your timezone)
   - **Tomorrow afternoon** (2 PM your timezone)
   - **Next Monday** (9 AM your timezone)
   - **Custom date and time** (select specific date/time)
5. Click **Schedule**

Email is queued and will send automatically at scheduled time.

**Managing Scheduled Emails:**

1. Go to **Emails** → **Scheduled**
2. View all pending scheduled emails
3. Options:
   - **Edit**: Modify email content or scheduled time
   - **Send Now**: Send immediately instead of waiting
   - **Cancel**: Delete scheduled email

**Optimal Send Times:**

NextCRM suggests optimal send times based on recipient's past email activity:

- When composing, look for **Optimal Send Time** suggestion
- Shows best day/time for this recipient based on when they historically open emails
- Click suggestion to auto-schedule for that time

**Pro Tip**: Schedule emails to arrive in recipient's inbox at optimal times (usually 8-10 AM their local timezone on Tuesday-Thursday). Avoid Mondays (inbox overload) and Fridays (week-end wind-down).

### Follow-Up Sequences

Automate multi-step email follow-ups:

**Creating a Sequence:**

1. Go to **Emails** → **Sequences**
2. Click **New Sequence**
3. Configure sequence:
   - **Sequence Name**: e.g., "Cold Outreach Follow-Up"
   - **Starting Condition**: When to trigger (email sent, no reply received, lead created, etc.)
4. Add sequence steps:

**Step 1:**
- Initial email template
- Send: Immediately

**Step 2:**
- Follow-up email template
- Send: 3 days after Step 1 (if no reply)

**Step 3:**
- Second follow-up email template
- Send: 7 days after Step 2 (if no reply)

**Step 4:**
- Final follow-up email template
- Send: 7 days after Step 3 (if no reply)

5. Set exit conditions:
   - Stop sequence if reply received
   - Stop if deal stage changes to "Closed Won" or "Closed Lost"
   - Stop if contact is marked "Do Not Contact"
6. Activate sequence

**Enrolling Contacts in Sequences:**

**Automatic Enrollment:**
- Set trigger conditions (e.g., new lead created with source "Website")
- Contacts matching criteria are automatically enrolled

**Manual Enrollment:**
1. Open Contact, Lead, or Account page
2. Click **Enroll in Sequence**
3. Select sequence
4. Customize start date (now or future date)
5. Click **Enroll**

**Managing Sequences:**

1. Go to **Emails** → **Sequences** → **Active Sequences**
2. View all contacts currently in sequences
3. See which step they're on
4. Options:
   - **Pause**: Temporarily pause sequence for a contact
   - **Resume**: Resume paused sequence
   - **Unenroll**: Remove contact from sequence
   - **Skip Step**: Skip next step and proceed to following step

**Sequence Performance:**

View sequence analytics:
- Enrollment count
- Completion rate (% who reach final step)
- Reply rate per step
- Open rate per step
- Unsubscribe rate
- Best-performing steps

Use data to optimize sequences (remove underperforming steps, adjust timing, etc.).

**Pro Tip**: Don't make sequences too long. 3-4 steps over 2-3 weeks is usually sufficient. If no response after that, the lead likely isn't interested or ready.

### Drip Campaigns

Nurture leads with automated email campaigns:

**Drip vs. Sequence:**
- **Sequence**: Follow-up emails sent conditionally (if no reply, proceed)
- **Drip**: Pre-planned series of emails sent on fixed schedule (regardless of replies)

**Creating a Drip Campaign:**

1. Go to **Emails** → **Campaigns**
2. Click **New Drip Campaign**
3. Configure campaign:
   - **Campaign Name**: e.g., "New Lead Nurture - Q1 2024"
   - **Goal**: What you're trying to achieve (education, demo booking, etc.)
   - **Audience**: Which contacts/leads to include (by tag, source, score, etc.)
4. Add campaign emails:

**Email 1 (Day 0):**
- Subject: "Welcome! Here's What to Expect"
- Content: Introduction, set expectations, provide value

**Email 2 (Day 3):**
- Subject: "Getting Started with [Product]"
- Content: Educational content, how-to guide

**Email 3 (Day 7):**
- Subject: "Case Study: How [Customer] Achieved [Result]"
- Content: Social proof, customer success story

**Email 4 (Day 14):**
- Subject: "Ready to See [Product] in Action?"
- Content: Call-to-action for demo or trial

**Email 5 (Day 21):**
- Subject: "Last Chance: Special Offer Inside"
- Content: Limited-time offer, urgency

5. Set campaign schedule (which days/times to send)
6. Configure exit rules (unsubscribe, becomes customer, etc.)
7. Activate campaign

**Campaign Analytics:**

Track campaign performance:
- Delivery rate
- Open rate per email
- Click rate per email
- Unsubscribe rate
- Conversion rate (goal completions)
- Revenue attributed to campaign

**A/B Testing Campaigns:**

Test variations:
1. Create campaign with A/B test enabled
2. For each email, specify variants (different subject or content)
3. Set test split (50/50, 30/70, etc.)
4. Launch campaign
5. NextCRM automatically sends variants according to split
6. View performance data to determine winners

**Pro Tip**: Space drip campaign emails appropriately. 2-3 emails per week max. More frequent = higher unsubscribe rates.

---

## Troubleshooting Email Issues

### Emails Not Syncing

**Symptoms:**
- New emails not appearing in NextCRM
- Sent emails not showing in sent folder
- Last sync time shows hours or days ago

**Troubleshooting Steps:**

**1. Check Sync Status:**
- Go to **Settings** → **Email Integration**
- Check **Last Sync** timestamp
- Look for error messages

**2. Check Connection:**
- Click **Test Connection** button
- If test fails, proceed to step 3
- If test succeeds, proceed to step 4

**3. Re-authenticate:**
- Click **Re-authenticate** button (for OAuth providers)
- Or update credentials (for IMAP/SMTP)
- Complete authentication flow
- Test connection again

**4. Check Sync Settings:**
- Verify **Sync Enabled** is toggled ON
- Check **Sync Frequency** (if set to manual, sync won't happen automatically)
- Check **Sync From Date** (emails before this date won't sync)

**5. Check Email Account Quota:**
- Some providers throttle API access if quota exceeded
- Wait 24 hours and try again
- Or contact provider to increase quota

**6. Check for Large Attachments:**
- Emails with very large attachments (50MB+) may fail to sync
- Check provider logs for specific failed emails
- Consider downloading these emails manually

**7. Force Manual Sync:**
- Click **Sync Now** button
- Monitor progress bar
- Check for specific error messages

**Still Not Working?**
- Contact support@nextcrm.io with:
  - Email provider name
  - Last successful sync timestamp
  - Error messages (screenshot helpful)
  - Approximate number of emails in account

### Tracking Not Working

**Symptoms:**
- Open tracking shows 0 opens (but you know email was opened)
- Link clicks not registering
- Tracking history is blank

**Troubleshooting Steps:**

**1. Verify Tracking Enabled:**
- When composing email, check **Enable Tracking** checkbox is ON
- Check if tracking is enabled globally: **Settings** → **Email Settings** → **Tracking** → **Enable Tracking**

**2. Check Recipient's Email Client:**
- Some clients block tracking (see "Client Limitations" section earlier)
- Ask recipient if they're using Outlook with images blocked, or Apple Mail with privacy protection

**3. Check Tracking Pixel Delivery:**
- Open sent email in your **Sent Items**
- View **Email Source** (raw HTML)
- Search for `tracking.nextcrm.io` - should appear in an `<img>` tag
- If not present, tracking wasn't enabled for this email

**4. Check Link Tracking URLs:**
- If links weren't replaced with tracking URLs, link tracking won't work
- Links should look like: `https://tracking.nextcrm.io/click/abc123def456`
- If your original links are still there, link tracking wasn't enabled

**5. Check for Email Forwarding:**
- If recipient forwards your email and someone else opens it, tracking may not attribute correctly
- Opens from forwarded emails sometimes register as the original recipient

**6. Wait for Delay:**
- Open tracking isn't instant (typically 1-5 minute delay)
- Link clicks register immediately

**7. Check Privacy Settings:**
- If you enabled "Disable Tracking for EU Domains," tracking won't work for those recipients
- Go to **Settings** → **Email Settings** → **Privacy** and review settings

**Still Not Working?**
- Test with your own email address:
  - Send tracked email to yourself
  - Open it on different device/client
  - Click tracked links
  - Check if events register in NextCRM
- If your test works, issue is with specific recipient's email client (not NextCRM)

### Connection Issues

**Symptoms:**
- "Authentication Failed" error
- "Connection Timeout" error
- "SSL Certificate Error"
- Emails stopped syncing after working previously

**Troubleshooting Steps:**

**1. Verify Credentials:**
- Double-check username/password
- Make sure caps lock is off
- For IMAP/SMTP, verify you're using app-specific password if 2FA is enabled

**2. Check Provider Status:**
- Visit your email provider's status page
- Gmail: https://www.google.com/appsstatus
- Outlook: https://portal.office.com/servicestatus
- If provider is down, wait for them to resolve

**3. Check Firewall/Network:**
- Some corporate networks block IMAP/SMTP ports
- Try connecting from different network (mobile hotspot, home network)
- If works on different network, contact your IT department

**4. Check Provider Settings:**
- Verify IMAP/SMTP is enabled on your email account
- Gmail: Settings → Forwarding and POP/IMAP → Enable IMAP
- Outlook: Settings → Sync Email → Enable IMAP

**5. Check App-Specific Passwords:**
- If using 2FA, regular password won't work
- Generate app-specific password:
  - Gmail: Security → App passwords → Generate
  - Outlook: Security → App passwords → Create new password
- Use this password in NextCRM (not your regular password)

**6. Check SSL Settings:**
- Try switching between SSL and STARTTLS
- Some providers require specific encryption types

**7. Update OAuth Tokens:**
- OAuth tokens expire after 60-90 days
- Click **Re-authenticate** to refresh token

**8. Check for Account Lockouts:**
- Too many failed login attempts may lock your account
- Log into provider's website to check for security alerts
- Unlock account if needed

**9. Contact Provider:**
- Some providers (especially corporate) require manual approval for third-party app access
- Contact your email administrator

**Still Not Working?**
- Gather diagnostic info:
  - Email provider name
  - Connection type (OAuth, IMAP/SMTP, Exchange)
  - Exact error message (screenshot)
  - Server URLs and ports (if IMAP/SMTP)
- Contact support@nextcrm.io with this info

### Email Sending Issues

**Symptoms:**
- Emails stuck in "Sending" status
- "Send Failed" error
- Sent emails not appearing in recipient's inbox (though showing as sent in NextCRM)
- Emails marked as spam

**Troubleshooting Steps:**

**1. Check SMTP Connection:**
- Go to **Settings** → **Email Integration**
- Click **Test Connection**
- Specifically test SMTP (sending), not just IMAP (receiving)

**2. Check Send Limits:**
- Most providers have daily send limits:
  - Gmail: 500/day (free), 2000/day (Workspace)
  - Outlook: 300/day (free), 10,000/day (Office 365)
- If you hit limit, wait 24 hours

**3. Check Recipient Address:**
- Verify recipient email is valid
- Look for typos
- Check for extra spaces or special characters

**4. Check for Blacklisting:**
- Your sending domain may be blacklisted
- Check: https://mxtoolbox.com/blacklists.aspx
- Enter your domain
- If blacklisted, contact provider to resolve

**5. Check SPF, DKIM, DMARC:**
- Proper email authentication prevents spam classification
- Verify SPF record includes NextCRM: `include:_spf.nextcrm.io`
- Add DKIM record provided by NextCRM
- Set DMARC policy
- Use tool to verify: https://dmarcian.com/domain-checker/

**6. Check Content:**
- Certain words trigger spam filters: "free," "guaranteed," "$$$," excessive caps
- Avoid spammy formatting (all caps, multiple colors, excessive exclamation marks)
- Include plain text version (not just HTML)

**7. Check Attachment Size:**
- Most providers limit attachment size (25MB for Gmail/Outlook)
- Compress large files or use links to files in Documents module

**8. Verify Sender Reputation:**
- New email accounts have low reputation (higher spam probability)
- "Warm up" new accounts by sending gradually increasing volumes over weeks
- Start with 10-20 emails/day, increase by 20% daily

**9. Ask Recipient to Check Spam Folder:**
- Email may have been delivered to spam
- Ask recipient to mark as "Not Spam" and add you to contacts

**10. Check for Bounces:**
- Hard bounces (invalid address) prevent delivery
- Soft bounces (full inbox, temporary issue) delay delivery
- View bounce report: **Emails** → **Bounces**

**Still Not Working?**
- Send test email to multiple providers (Gmail, Outlook, Yahoo)
- If fails on all, issue is with your configuration
- If fails on one, issue is with that provider's spam filter
- Contact support@nextcrm.io with:
  - Recipient email address (with permission to share)
  - Email content (with sensitive info redacted)
  - Error message
  - Send timestamp

---

**Need Help?** Contact support at support@nextcrm.io or see the [Troubleshooting Guide](TROUBLESHOOTING.md) for more common issues.

**Related Guides:**
- [CRM Guide](CRM-GUIDE.md) - Link emails to accounts, contacts, and leads
- [Admin Guide](ADMIN-GUIDE.md) - Configure email settings organization-wide
- [Documents Guide](DOCUMENTS-GUIDE.md) - Attach documents to emails
