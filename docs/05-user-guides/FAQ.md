# Frequently Asked Questions (FAQ)

## General Questions

### What is NextCRM?

NextCRM is a cloud-based Customer Relationship Management (CRM) platform designed to help teams manage accounts, leads, opportunities, projects, invoices, and documents all in one place. It's built for modern teams that need real-time collaboration, AI-powered features, and enterprise-grade security.

### What does NextCRM cost?

NextCRM offers three plans:

- **FREE**: $0/month - Perfect for getting started
  - Up to 3 team members
  - Basic CRM features (Accounts, Leads, Contacts, Opportunities)
  - 5GB document storage
  - Community support

- **PRO**: $99/month (billed annually) - For growing teams
  - Up to 20 team members
  - All modules (CRM, Projects, Invoices, Documents, Email)
  - 50GB document storage
  - Email support
  - AI features (100 requests/month)

- **ENTERPRISE**: Custom pricing - For large organizations
  - Unlimited team members
  - All features included
  - 500GB+ document storage
  - Custom integrations
  - Dedicated support
  - SLA guarantees

**See [plans page](https://nextcrm.io/pricing) for current pricing.**

### What's included in each plan?

**Feature Comparison:**

| Feature | FREE | PRO | ENTERPRISE |
|---------|------|-----|-----------|
| Team members | 3 | 20 | Unlimited |
| CRM modules | ✅ | ✅ | ✅ |
| Projects | ❌ | ✅ | ✅ |
| Invoices | ❌ | ✅ | ✅ |
| Documents | 5GB | 50GB | 500GB+ |
| Email integration | ❌ | ✅ | ✅ |
| API access | ❌ | ✅ | ✅ |
| AI features | ❌ | 100/month | Unlimited |
| Support | Community | Email | Dedicated |
| Uptime SLA | 99.5% | 99.9% | 99.99% |

### Is my data secure?

Yes. NextCRM implements enterprise-grade security:

- **Encryption**: AES-256 encryption at rest, SSL/TLS in transit
- **Authentication**: JWT tokens, OAuth 2.0, optional MFA
- **Authorization**: Role-based access control (RBAC), multi-organization isolation
- **Compliance**: SOC 2 Type II certified, GDPR compliant, WCAG 2.1 accessible
- **Auditing**: Complete audit logs, 7-year retention
- **Backups**: Automated daily backups, 30-day retention

### Where is my data stored?

Data is stored on secure cloud servers:
- **Primary**: United States (AWS US-East-1)
- **Backup**: Europe (AWS EU-West-1)
- **Georeplication**: Automatic backups to multiple regions

*Enterprise customers can request data residency in specific regions.*

### What support is available?

**Support Channels:**
- **FREE Plan**: Community forum only
- **PRO Plan**: Email support (24-48 hour response)
- **ENTERPRISE**: Dedicated support with SLA

**Resources:**
- [Knowledge base](https://nextcrm.io/docs)
- [Video tutorials](https://nextcrm.io/tutorials)
- [Community forum](https://forum.nextcrm.io)
- [Status page](https://status.nextcrm.io)

**Contact:**
- Email: support@nextcrm.io
- Chat: In-app support (PRO/ENTERPRISE only)

### Can I customize NextCRM?

Standard customization:
- Custom fields per module
- Custom modules (ENTERPRISE)
- Integration via API
- Custom branding (ENTERPRISE)

Not available:
- Custom UI/UX
- Custom reports (in development)
- Custom workflows (in development)

---

## Account & Signup

### How do I create an account?

1. Go to [nextcrm.io](https://nextcrm.io)
2. Click "Sign Up"
3. Enter email and password
4. Verify email address
5. Create organization
6. Start using NextCRM!

**Or use OAuth:**
- Sign up with Google
- Sign up with GitHub

### Can I have multiple organizations?

Yes! You can create or join multiple organizations:

**Create new organization:**
1. Settings > Organizations > "+ New Organization"
2. Enter organization name
3. Click "Create"
4. Start inviting team members

**Switch between organizations:**
1. Click organization name (top-left)
2. Select different organization
3. Data switches instantly

**Leave organization:**
1. Go to Settings > Organizations
2. Find organization
3. Click "Leave"
4. Confirmation required

### How do I switch between organizations?

**Web:**
1. Click organization name in top-left corner
2. Select different organization from dropdown
3. Interface updates with new org data

**Mobile:**
1. Tap menu icon
2. Tap organization name
3. Select different organization

### Can I invite team members?

Yes! Send invitations:

1. Go to Settings > Team Members
2. Click "+ Invite"
3. Enter email addresses (comma-separated)
4. Select role (Member, Admin)
5. Click "Send Invitations"

**Invitees receive:**
- Email with invitation link
- Link valid for 7 days
- Can create account or use OAuth

### What happens to my account if I leave the company?

When you're removed from an organization:

- Access revoked immediately
- Cannot see organization data
- Can access other organizations you belong to
- Data remains in system (unless deleted)
- 30-day deletion period for your records

*Owner/Admin can permanently delete your account.*

### How do I delete my account?

**Delete account (privacy right):**

1. Settings > Privacy > "Delete My Account"
2. 30-day grace period begins
3. Can cancel within 30 days
4. After 30 days: permanently deleted
5. All personal data removed

**Download data before deleting:**
1. Settings > Privacy > "Export My Data"
2. Email with download link sent
3. Link valid 7 days
4. Includes all data associated with your account

### Can I export my data?

Yes! Export options:

**Export all your data:**
1. Settings > Privacy > "Export My Data"
2. Generates ZIP file with all data
3. Email sent with download link (valid 7 days)

**Export specific reports:**
1. Open report (e.g., Sales Pipeline)
2. Click "Export"
3. Choose format (CSV, Excel, PDF)

**API export (PRO/ENTERPRISE):**
- Use API endpoints to export data programmatically
- [API Documentation](../04-api-reference/REST-API.md)

---

## Features

### How do I import data from another CRM?

**Supported import formats:**
- CSV (Comma-separated values)
- Excel (.xlsx)
- Direct connectors (Salesforce, HubSpot - coming soon)

**Import process:**
1. Go to module (CRM, Projects, etc.)
2. Click "Import"
3. Select file or connector
4. Map fields (match your data to NextCRM fields)
5. Review import preview
6. Confirm import

**For detailed instructions:** See [CRM-GUIDE.md](CRM-GUIDE.md#bulk-import)

### Can I import from specific CRMs?

**Currently supported:**
- CSV/Excel from any CRM

**Coming soon:**
- Salesforce
- HubSpot
- Pipedrive
- Other on request

**Not supported:**
- Direct database imports
- Custom CRM systems

*Contact support for custom import assistance.*

### What CRMs can I import from?

Any CRM can export to CSV/Excel format:

**Export steps (varies by CRM):**
1. Open CRM
2. Select records or report
3. Click "Export"
4. Choose CSV or Excel
5. Save file
6. Import to NextCRM

**For help:**
- Check CRM documentation
- Contact CRM support
- Email our support team

### Can I schedule reports?

**Manual reports:**
- View anytime
- Export anytime
- Share with team

**Scheduled reports (coming Q1 2025):**
- Automated weekly/monthly email
- Custom recipients
- Multiple formats (PDF, Excel)

*Current workaround: Export report, email to team manually*

### Does NextCRM have an API?

Yes! RESTful API available:

- **FREE Plan**: No API access
- **PRO Plan**: API access included
- **ENTERPRISE**: Unlimited API access

**What you can do with API:**
- Create/read/update/delete records
- Manage users
- Access billing info
- Integrate with other apps
- Build custom applications

[Full API Documentation](../04-api-reference/README.md)

### Can I integrate with other tools?

**Currently integrated:**
- Gmail / Outlook / Exchange (email sync)
- Stripe (payment processing)
- UploadThing (file storage)
- DigitalOcean Spaces (document storage)

**Coming soon:**
- Slack integration
- Calendar sync (Google Calendar, Outlook)
- Zapier
- Make.com

**Custom integrations:**
- Use API to build custom integrations
- Webhooks support
- OAuth available

**Request integration:**
- [Feature request form](https://nextcrm.io/feature-request)

### What integrations are available?

**Email:**
- Gmail (IMAP/SMTP)
- Outlook (Office 365)
- Exchange (enterprise)

**Payments:**
- Stripe (subscriptions, invoices)

**File Storage:**
- UploadThing (cloud storage)
- DigitalOcean Spaces (S3-compatible)

**Calendar (Coming Soon):**
- Google Calendar
- Outlook Calendar

**Communication (Coming Soon):**
- Slack
- Microsoft Teams

**Automation (Coming Soon):**
- Zapier
- Make.com

---

## Technical Questions

### What browsers are supported?

**Fully supported:**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Partially supported:**
- Chrome mobile
- Safari mobile
- Firefox mobile
- Edge mobile

**Not supported:**
- Internet Explorer (any version)
- Opera
- Older browser versions

**Pro tip:** Use latest browser version for best experience

### Is there a mobile app?

**Status:**
- iOS: Coming Q2 2025
- Android: Coming Q2 2025
- Web: Fully responsive (works on mobile now!)

**Current mobile option:**
- Use web app on mobile browser
- Optimized for phone screens
- Touch-friendly interface
- Mobile camera for photo uploads

### Can I use NextCRM offline?

**Currently:**
- Requires internet connection
- No offline mode

**Offline capability (coming Q3 2025):**
- Edit records offline
- Changes sync when online
- Works on mobile

**Current alternatives:**
- Use pre-downloaded reports
- Screenshot important data
- Export before traveling

### What's the uptime SLA?

**Guaranteed uptime:**
- FREE Plan: 99.5% (7.2 hours downtime/month)
- PRO Plan: 99.9% (43 minutes downtime/month)
- ENTERPRISE: 99.99% (4 minutes downtime/month)

**Service credits:**
- 99.5-99.9: 10% monthly credit
- 99-99.5: 25% monthly credit
- <99%: 100% monthly credit

**Check status:** [status.nextcrm.io](https://status.nextcrm.io)

### How often is NextCRM updated?

**Release schedule:**
- Weekly patches (bug fixes, security)
- Monthly features (new capabilities)
- Quarterly major releases (large features)

**Maintenance windows:**
- Tuesday 2am-4am EST (minimal)
- Scheduled maintenance announced 7 days prior

**Beta program:**
- Test new features early
- [Join beta program](https://nextcrm.io/beta)

### Do you have a status page?

Yes! Check system status:

**Status Page:** [status.nextcrm.io](https://status.nextcrm.io)

**Information available:**
- Current system status
- Incident history
- Maintenance schedule
- Response times
- Component status

**Subscribe to updates:**
- Email notifications
- SMS alerts
- Webhook integration

---

## Billing & Payments

### How is billing calculated?

**Monthly billing:**
- Charged on same day each month
- Prorated if mid-month upgrade
- Usage-based overage charges (storage only)

**Annual billing (10% discount):**
- Charged yearly
- Divided into 12 monthly payments
- Saves $120+/year on PRO plan

**Overage charges:**
- Storage overage: $1/GB per month
- Additional users: $10/user for month
- Billed separately from subscription

### When am I charged?

**First payment:**
- Due immediately after signup
- Card charged within 24 hours
- Access granted immediately

**Recurring payments:**
- Same day each month at 12:00 AM UTC
- Invoice emailed when charged
- Payment methods stored securely

**Failed payments:**
- 3 retry attempts over 7 days
- Service suspended after 7 days
- Account reactivated once paid

### Can I change my plan mid-month?

Yes! Upgrade or downgrade anytime:

**Upgrade:**
1. Settings > Billing > "Change Plan"
2. Select new plan
3. Prorated charge applied
4. New features available immediately

**Downgrade:**
1. Settings > Billing > "Change Plan"
2. Select lower plan
3. Credit applied to next billing cycle
4. Changes take effect at next billing date

### What happens if I downgrade?

**Immediate (same day):**
- Features become unavailable
- Records remain intact
- Excess team members notified

**At next billing date:**
- Charged lower price
- Full removal of advanced features

**Examples:**
- Downgrade to FREE: Projects/Email disabled
- PRO → FREE: 17 team members beyond limit get removed

### Do you offer refunds?

**Refund policy:**
- 30-day money-back guarantee on first month
- Mid-month downgrades get credit to next month
- No refund for overage charges
- No refund if service terms violated

**Request refund:**
1. Contact support@nextcrm.io
2. Include reason
3. Processed within 5 business days

### What payment methods do you accept?

**Accepted payments:**
- Credit card (Visa, MasterCard, Amex)
- Debit card
- ACH (for US accounts)
- Bank transfer (ENTERPRISE only)

**Stored securely:**
- PCI compliant
- Encrypted
- Never stored on our servers

### Can I get an invoice?

Yes! View and download invoices:

1. Settings > Billing > "Invoices"
2. Click invoice to view
3. Click download (PDF)
4. Invoices emailed automatically

**Invoice includes:**
- Billing period
- Amount charged
- Items (subscription, overage)
- Payment method
- Tax (if applicable)

### Do you offer discounts for annual billing?

Yes! Save 10% with annual billing:

- **Monthly**: $99/month ($1,188/year)
- **Annual**: $89/month ($1,068/year)
- **Savings**: $120/year

**Switch to annual:**
1. Settings > Billing
2. Click "Switch to Annual"
3. Prorated adjustment applied
4. Next charge will be annual amount

---

## Data & Privacy

### Where is my data stored?

**Data centers:**
- Primary: AWS US-East-1 (Virginia)
- Backup: AWS EU-West-1 (Ireland)
- Automatic replication
- Regular backups

**Data residency:**
- ENTERPRISE plans can request specific region
- Options: US, EU, or APAC
- Premium pricing may apply
- 30-day setup time

### How long is data retained?

**Active data:**
- Retained indefinitely
- Deleted records removed after 30 days
- Audit logs retained 7 years

**Backups:**
- Automatic daily backups
- 30-day backup retention
- Recovery available for deleted data

**Upon account deletion:**
- Personal data removed immediately
- Organizational data deleted after 30 days
- Backups purged after 30 days
- Deletion logged in audit trail

### What compliance certifications do you have?

**Certifications:**
- ✅ SOC 2 Type II (audit completed annually)
- ✅ GDPR compliant (EU data protection)
- ✅ CCPA compliant (California privacy)
- ✅ WCAG 2.1 AA (accessibility)
- ✅ Privacy Act compliant (US federal)

**In progress:**
- ISO 27001 (information security)
- HIPAA (healthcare - coming 2025)

### Are you GDPR compliant?

Yes! Full GDPR compliance:

**Features:**
- Data Processing Agreement (DPA) available
- User data export right
- User deletion right
- Data breach notification
- Privacy controls

**User rights:**
- Right to access data
- Right to export data
- Right to be forgotten (delete)
- Right to data portability

**Data handling:**
- EU data in EU servers (option)
- No third-party data selling
- Transparent data practices

### Can I request my data?

Yes! Exercise your data rights:

**Export your data:**
1. Settings > Privacy > "Export My Data"
2. Email sent with download link
3. ZIP file contains all data
4. Link valid 7 days

**Request specific data:**
1. Email support@nextcrm.io
2. Specify data type
3. Processed within 30 days (GDPR requirement)

### What's your data deletion policy?

**Immediate deletion:**
- User account deletion (30-day grace)
- Record deletion (moved to trash)

**Soft deletion (30-day grace):**
- Can recover deleted records
- After 30 days: permanent deletion
- Deletion logged in audit trail

**Permanent deletion:**
- After 30 days: unrecoverable
- Audit log entries retained 7 years (GDPR)
- Backups purged

**Bulk deletion:**
- Admin can bulk delete records
- Same 30-day grace period applies
- Deletion logged per record

### Who can access my data?

**Access permissions:**
- Only your organization members (per role)
- NextCRM admins (security/compliance only)
- No external third parties
- No data brokers or resellers

**Logged access:**
- All data access logged in audit trail
- View access logs anytime
- Export for compliance

**Security review:**
- Annual SOC 2 audit
- External security firm reviews
- No unauthorized access incidents to date

### Is my data encrypted?

**Encryption in transit:**
- SSL/TLS for all connections
- HTTPS-only (no HTTP)
- Encrypted email transfers

**Encryption at rest:**
- AES-256 encryption
- Encryption keys stored separately
- Regular key rotation

**Encrypted storage:**
- Database encryption
- File storage encryption
- Backup encryption

---

## Getting Help

**Still have questions?**

- **Email**: support@nextcrm.io
- **Chat**: In-app chat (PRO/ENTERPRISE)
- **Forum**: [forum.nextcrm.io](https://forum.nextcrm.io)
- **Docs**: [nextcrm.io/docs](https://nextcrm.io/docs)
- **Status**: [status.nextcrm.io](https://status.nextcrm.io)

**For bugs or features:**
- [Report bug](https://nextcrm.io/report-bug)
- [Request feature](https://nextcrm.io/feature-request)
