# PRD: Billing & Subscription Management

**Version:** 1.0
**Status:** Critical - P0 Launch Blocker
**Owner:** Product Team
**Last Updated:** 2025-11-17
**Related PRDs:** [PRD-MULTI-TENANCY.md](./PRD-MULTI-TENANCY.md), [PRD-ADMIN.md](./PRD-ADMIN.md)

---

## 1. Executive Summary

The Billing & Subscription Management module transforms NextCRM from a free tool into a monetizable SaaS business. This module provides Stripe-powered subscription management with three pricing tiers (FREE, PRO, ENTERPRISE), automated usage enforcement, payment processing, invoice generation, and dunning management. It's the revenue engine enabling sustainable business growth.

**Key Value Proposition:**
- **Automated Revenue Collection:** Stripe subscriptions with automatic billing, retry logic, and payment method updates reduce manual payment collection overhead by 95%
- **Usage-Based Enforcement:** Real-time quota checks (users, storage, contacts) automatically upgrade prompts or block creation at limits, driving upgrade conversion
- **Transparent Pricing:** Clear 3-tier pricing (FREE/PRO/ENTERPRISE) with documented limits eliminates sales friction
- **Compliance-Ready:** Tax calculation, VAT handling, invoice generation, and payment receipts meet global accounting standards

**Target Release:** Q1 2025 (MUST ship before paid customer acquisition)

---

## 2. Problem Statement

### Current Situation
SaaS businesses without automated billing face manual invoicing nightmares, payment collection delays, and failed renewal revenue. Customers churn due to payment failures that could be resolved with retry logic. Without usage enforcement, businesses over-provision resources leading to unsustainable unit economics. Tax compliance and invoice generation consume finance team bandwidth.

### Why This Matters
Billing failures directly impact revenue and growth:
- **Revenue Leakage:** 10-20% of subscription revenue lost to failed payments without retry logic (Recurly Subscription Economy Report)
- **Manual Overhead:** Finance teams spend 15-25 hours/month on invoice generation and payment reconciliation
- **Churn:** 40% of "churn" is actually involuntary (expired cards, failed payments) and recoverable with dunning
- **Compliance Risk:** Missing VAT collection or invoice requirements leads to fines and audit issues

### Success Vision
An organization signs up for NextCRM FREE plan and invites 3 team members. As they grow to 6 users, the system prompts upgrade to PRO plan ($49/month). Owner clicks "Upgrade", enters Stripe payment details, and subscription activates immediately. Invoices generate automatically monthly, payment succeeds, and receipts email to owner. When a card expires, automated retry logic (3 attempts over 7 days) and dunning emails recover 70% of failed payments. Finance team spends zero hours on billing operations. Tax authorities never question NextCRM's VAT compliance.

---

## 3. Target Users/Personas

### Primary Persona: Organization Owner (Buyer)
- **Role:** Decision-maker controlling budget and payment methods
- **Goals:**
  - Understand pricing before committing (transparent pricing)
  - Upgrade/downgrade plan based on team growth or shrinkage
  - Manage payment methods and view invoices without contacting support
  - Avoid surprise charges or overage fees
- **Pain Points:**
  - Unclear pricing causing hesitation to upgrade
  - Inability to self-serve payment method updates (expired cards)
  - Missing invoices for accounting reconciliation
  - Cannot cancel subscription without contacting sales
- **Use Cases:**
  - Upgrading from FREE to PRO when hitting 5-user limit
  - Updating expired credit card to prevent service disruption
  - Downloading past invoices for accounting department
  - Cancelling subscription when project ends (no commitment)

### Secondary Persona: Finance/Accounting Manager
- **Role:** Responsible for reconciling payments and managing vendor invoices
- **Goals:**
  - Access all historical invoices for audit compliance
  - Ensure VAT is correctly calculated and collected
  - Export payment history for accounting software (QuickBooks, Xero)
  - Verify no surprise charges or billing errors
- **Pain Points:**
  - Invoices not detailed enough (missing line items, VAT breakdown)
  - Cannot download invoices in PDF format
  - Payment receipts not emailed automatically
  - No way to update billing email address
- **Use Cases:**
  - Quarterly export of all invoices for accounting reconciliation
  - Verifying VAT numbers match company registration
  - Forwarding invoices to external accounting firm

### Tertiary Persona: NextCRM Admin (Internal)
- **Role:** NextCRM support or operations team managing customer billing
- **Goals:**
  - View customer subscription status to triage support tickets
  - Manually apply credits or refunds for service issues
  - Suspend organizations for non-payment
  - Monitor failed payment rates and dunning effectiveness
- **Pain Points:**
  - No admin dashboard showing at-risk subscriptions
  - Cannot manually retry failed payments
  - Insufficient visibility into payment failure reasons
- **Use Cases:**
  - Applying $50 credit to customer after service outage
  - Manually retrying payment after customer updates card
  - Suspending organization after 3 failed payment attempts

---

## 4. Functional Requirements

### 4.1 Core Features

#### Feature 1: Subscription Plan Management
**Description:** Three-tier subscription plans (FREE, PRO, ENTERPRISE) with defined limits, pricing, and feature access. Organizations can upgrade, downgrade, or cancel subscriptions with prorated billing.

**User Stories:**
- As an owner, I want to see plan comparison so I understand what I get at each tier
- As an owner, I want to upgrade to PRO plan so I can invite more team members
- As an owner, I want to downgrade to FREE if team shrinks below 5 users
- As an owner, I want to cancel subscription at end of billing period (no immediate shutoff)

**Specifications:**
- **Plan Tiers:**

| Feature | FREE | PRO ($49/month) | ENTERPRISE (Custom) |
|---------|------|-----------------|---------------------|
| **Users** | 5 users | Unlimited users | Unlimited users |
| **Contacts** | 1,000 contacts | 50,000 contacts | Unlimited contacts |
| **Storage** | 1 GB | 100 GB | Unlimited storage |
| **Projects** | 5 projects | Unlimited projects | Unlimited projects |
| **Documents** | 100 documents | 10,000 documents | Unlimited documents |
| **Email Integration** | ✗ | ✓ | ✓ |
| **AI Features** | ✗ | ✓ (100 requests/month) | ✓ (Unlimited) |
| **API Access** | ✗ | ✓ (1,000 calls/day) | ✓ (Custom rate limits) |
| **Support** | Community forum | Email support (48h) | Priority support (4h SLA) + CSM |
| **SSO/SAML** | ✗ | ✗ | ✓ |
| **Custom Branding** | ✗ | ✗ | ✓ |
| **SLA** | None | 99.5% uptime | 99.9% uptime |
| **Billing** | Free | Monthly/Annual | Annual contract |

- **Stripe Price IDs:**
  - FREE: No Stripe product (no subscription)
  - PRO Monthly: `price_pro_monthly` ($49/month)
  - PRO Annual: `price_pro_annual` ($499/year, ~15% discount)
  - ENTERPRISE: Custom quotes, manual Stripe invoice

- **Subscription Upgrade Flow:**
  1. Owner navigates to Settings → Billing → Change Plan
  2. Plan comparison table displayed (current plan highlighted)
  3. Owner clicks "Upgrade to PRO"
  4. Stripe Checkout modal opens with payment form
  5. Owner enters card details (Stripe Elements for PCI compliance)
  6. On payment success:
     - Create Subscriptions record: organizationId, stripeSubscriptionId, stripePriceId, status=ACTIVE
     - Update Organizations: plan=PRO, stripeCustomerId=[customer_id]
     - Create PaymentHistory record: amount=$49, status=SUCCEEDED
     - Update OrganizationUsage limits (trigger quota recalculation)
  7. Redirect to success page with invoice download link
  8. Send confirmation email with receipt

- **Subscription Downgrade Flow:**
  1. Owner clicks "Downgrade to FREE"
  2. Confirmation modal: "Your PRO features will be disabled at end of billing period ([date])"
  3. On confirm:
     - Update Subscriptions: cancelAtPeriodEnd=true
     - Do NOT change Organizations.plan immediately (wait until period end)
  4. Stripe webhook `customer.subscription.updated` fires at period end:
     - Update Organizations: plan=FREE, status=ACTIVE
     - Enforce FREE plan limits (may lock records if over quota)

- **Subscription Cancellation Flow:**
  - Same as downgrade to FREE
  - Option: "Cancel immediately" (with prorated refund) or "Cancel at period end" (no refund, keep access)
  - Audit log entry: "Subscription cancelled by [User]"

- **Prorated Billing:**
  - Upgrades: Charge prorated amount for remaining days in billing period
  - Downgrades: Apply prorated credit to next invoice
  - Stripe handles proration calculations automatically

**UI/UX Considerations:**
- Plan comparison page with clear feature matrix and pricing
- "Current Plan" badge on active tier
- Upgrade/downgrade buttons with clear CTAs
- Stripe Checkout embedded iframe for seamless payment (no redirect)
- Success page with animated checkmark and "Download Invoice" button

---

#### Feature 2: Payment Processing & Stripe Integration
**Description:** Secure payment collection via Stripe Checkout and Elements, supporting credit cards, debit cards, and ACH transfers. PCI DSS compliance through Stripe's hosted payment pages.

**User Stories:**
- As an owner, I want to pay with credit card so I can subscribe quickly
- As an owner, I want to save my card for automatic monthly billing
- As an owner, I want to update my card when it expires without service interruption
- As a European customer, I want to pay with SEPA Direct Debit

**Specifications:**
- **Stripe Checkout Integration:**
  - Use Stripe Checkout Sessions API for hosted payment page
  - Session parameters:
    - `mode: 'subscription'`
    - `line_items`: [{ price: stripePriceId, quantity: 1 }]
    - `customer_email`: organization owner email
    - `success_url`: `/billing/success?session_id={CHECKOUT_SESSION_ID}`
    - `cancel_url`: `/billing/cancel`
  - Checkout session creates Stripe Customer and Subscription automatically

- **Payment Methods Supported:**
  - Credit cards (Visa, Mastercard, Amex, Discover)
  - Debit cards
  - ACH Direct Debit (US only)
  - SEPA Direct Debit (Europe)
  - Future: Alipay, WeChat Pay for Asian markets

- **Payment Method Management:**
  - Owner navigates to Settings → Billing → Payment Methods
  - Stripe Elements integration for updating card (PCI-compliant iframe)
  - List of saved payment methods (card brand, last 4 digits, expiration)
  - "Set as default" option for multiple cards
  - "Remove" option for old cards (cannot remove default if subscription active)

- **Payment Security:**
  - All card data handled by Stripe (never touches NextCRM servers)
  - Stripe Elements tokenizes card data before submission
  - PCI DSS Level 1 compliance via Stripe
  - 3D Secure authentication for European cards (SCA requirement)

- **Payment Webhooks (Stripe):**
  - `checkout.session.completed`: Create subscription in database
  - `invoice.payment_succeeded`: Record payment in PaymentHistory
  - `invoice.payment_failed`: Trigger dunning workflow
  - `customer.subscription.updated`: Update subscription status
  - `customer.subscription.deleted`: Downgrade to FREE plan

**UI/UX Considerations:**
- Stripe Checkout modal overlays (not full-page redirect)
- Payment methods page shows card icons (Visa logo, etc.)
- Clear "Your card ending in 1234 will be charged $49 on [date]" messaging
- Security badges (Stripe Verified, PCI Compliant) for trust

---

#### Feature 3: Invoice Generation & Management
**Description:** Automatic PDF invoice generation for every payment, downloadable from billing portal and emailed to owner. Invoices include line items, VAT breakdown, and company tax information.

**User Stories:**
- As an owner, I want to download invoices for accounting so I can reconcile payments
- As a finance manager, I want invoices to include VAT details so I comply with tax law
- As an owner, I want invoices emailed automatically so I don't need to log in to download them
- As an owner, I want to update billing email address so invoices go to accounting team

**Specifications:**
- **Invoice Data (PaymentHistory Model):**
  - `id`: ObjectId
  - `organizationId`: Foreign key
  - `stripePaymentIntentId`: Stripe payment ID (unique)
  - `stripeInvoiceId`: Stripe invoice ID (nullable)
  - `amount`: Integer (cents, e.g., 4900 = $49.00)
  - `currency`: String (default: "usd")
  - `status`: PaymentStatus enum (SUCCEEDED, PENDING, FAILED, CANCELED, REFUNDED)
  - `description`: String (e.g., "NextCRM PRO - Monthly Subscription")
  - `receiptUrl`: String (Stripe-hosted receipt URL)
  - `createdAt`: DateTime

- **Invoice PDF Generation:**
  - Use Stripe's invoice PDF generation (via `invoice.invoice_pdf` URL)
  - OR build custom PDF with invoice template library (pdfkit, React-PDF)
  - Invoice components:
    - Header: NextCRM logo, company address
    - Invoice number: Auto-generated (ORG-[date]-[sequence], e.g., ORG-20250117-001)
    - Issue date, due date (same as payment date for subscriptions)
    - Bill to: Organization name, owner name, billing email
    - Line items: "NextCRM PRO - Monthly Subscription" x 1 = $49.00
    - Subtotal, VAT/Tax (if applicable), Total
    - Payment method: Card ending in [last 4 digits]
    - Footer: Payment terms, company tax ID

- **Invoice Delivery:**
  - Automated email on `invoice.payment_succeeded` webhook:
    - Subject: "Invoice for NextCRM PRO - [Organization Name]"
    - Body: "Thank you for your payment. Your invoice is attached."
    - Attachment: Invoice PDF
    - Link to billing portal: "View all invoices"
  - Billing portal page: Table of all invoices (date, amount, status, download button)

- **Invoice History:**
  - `/billing/invoices` page showing all PaymentHistory records
  - Table columns: Date, Description, Amount, Status, Actions (Download PDF)
  - Filter by date range, status
  - Export all invoices to ZIP file

- **Billing Email Management:**
  - Owner can set `billingEmail` in organization settings (separate from owner email)
  - Invoices sent to billingEmail if set, otherwise owner email
  - Supports multiple billing emails (comma-separated)

**UI/UX Considerations:**
- Invoice table with sortable columns (newest first by default)
- Status badges: Green (Paid), Yellow (Pending), Red (Failed)
- One-click PDF download button (no page navigation)
- "Email Invoice" button to resend to billing email

---

#### Feature 4: Usage Enforcement & Quota Management
**Description:** Real-time enforcement of plan limits (users, contacts, storage, projects, documents) with upgrade prompts when limits reached. Prevents organizations from exceeding quotas, driving upgrade conversion.

**User Stories:**
- As a FREE user, I want to be blocked from adding 6th user so I understand I need to upgrade
- As a PRO user, I want to see usage dashboard so I know how close I am to limits
- As an owner, I want upgrade CTA when hitting limits so I can seamlessly expand capacity
- As a system admin, I want grace period (7 days) after downgrade so customers don't lose data immediately

**Specifications:**
- **OrganizationUsage Model (Existing):**
  - `organizationId`: Foreign key (unique)
  - `usersCount`: Integer (current # of users)
  - `contactsCount`: Integer (current # of contacts)
  - `storageBytes`: Integer (total file storage in bytes)
  - `projectsCount`: Integer (current # of projects)
  - `documentsCount`: Integer (current # of documents)
  - `accountsCount`, `leadsCount`, `opportunitiesCount`, `tasksCount`: Additional counters
  - `lastCalculatedAt`: DateTime (updated on every counter change)

- **Plan Limits:**
```typescript
const PLAN_LIMITS = {
  FREE: {
    users: 5,
    contacts: 1000,
    storageGB: 1,
    projects: 5,
    documents: 100,
  },
  PRO: {
    users: Infinity, // Unlimited
    contacts: 50000,
    storageGB: 100,
    projects: Infinity,
    documents: 10000,
  },
  ENTERPRISE: {
    users: Infinity,
    contacts: Infinity,
    storageGB: Infinity,
    projects: Infinity,
    documents: Infinity,
  },
};
```

- **Quota Enforcement Flow:**
  1. User attempts action (e.g., "Invite new user")
  2. Server action checks current usage:
     ```typescript
     const usage = await prisma.organizationUsage.findUnique({
       where: { organizationId }
     });
     const limits = PLAN_LIMITS[organization.plan];
     if (usage.usersCount >= limits.users) {
       throw new Error('User limit reached. Upgrade to PRO for unlimited users.');
     }
     ```
  3. If under limit: Allow action, increment counter
  4. If at limit: Block action, show upgrade modal

- **Upgrade Prompts:**
  - Modal UI: "You've reached your limit of 5 users on the FREE plan."
  - CTA button: "Upgrade to PRO for unlimited users ($49/month)"
  - Secondary action: "Manage users" (remove user to free up slot)
  - Triggered on: User creation, contact creation, document upload, project creation

- **Grace Period (Downgrade Scenario):**
  - When downgrading from PRO → FREE, if currently over limits (e.g., 8 users):
    - Do NOT immediately delete records
    - Set organization status = GRACE_PERIOD (custom status)
    - Display banner: "You have 7 days to reduce to 5 users before accounts are locked"
    - After 7 days: Lock additional users (status=INACTIVE), prevent editing over-limit records
    - Do NOT delete data (preserve for upgrade)

- **Usage Dashboard:**
  - Billing settings page shows usage bars:
    - "Users: 4 / 5 (80% used)" - Orange progress bar
    - "Contacts: 234 / 1,000 (23% used)" - Green progress bar
    - "Storage: 0.8 GB / 1 GB (80% used)" - Orange progress bar
  - Color coding: Green (<70%), Orange (70-90%), Red (>90%)
  - "Upgrade Plan" button when any metric >80%

**UI/UX Considerations:**
- Upgrade modal triggered inline (not disruptive)
- Clear messaging: "You need PRO plan for this feature"
- Usage dashboard visible on billing settings page
- No hard data deletion (preserve for upgrade, lock editing only)

---

#### Feature 5: Dunning Management & Payment Retry Logic
**Description:** Automated retry logic for failed payments with 3 attempts over 7 days. Email notifications to owner on each failure. Suspend organization after final failure, with manual retry option.

**User Stories:**
- As an owner, I want automatic payment retry so expired card doesn't immediately shut off service
- As an owner, I want email notification when payment fails so I can update card
- As an owner, I want 7-day grace period before suspension so I have time to fix payment issues
- As a NextCRM admin, I want to manually retry payment after customer updates card

**Specifications:**
- **Stripe Smart Retry:**
  - Enable Stripe's automatic payment retry settings:
    - Retry 1: Immediately (instant retry)
    - Retry 2: 3 days after initial failure
    - Retry 3: 7 days after initial failure
  - Stripe handles retry timing automatically via subscription settings

- **Payment Failure Webhook (`invoice.payment_failed`):**
  1. Stripe webhook fires on payment failure
  2. Update Subscriptions record: status=PAST_DUE
  3. Create PaymentHistory record: status=FAILED
  4. Send dunning email to owner:
     - Subject: "Payment Failed - Action Required"
     - Body: "We couldn't process your payment. Please update your card to avoid service interruption."
     - CTA: "Update Payment Method" (link to billing settings)
     - Details: Failure reason (expired card, insufficient funds), next retry date

- **Dunning Email Schedule:**
  - Failure 1: Immediate email + retry
  - Failure 2: Email on day 3 + retry (subject: "Second Payment Attempt Failed")
  - Failure 3: Email on day 7 + final retry (subject: "URGENT: Final Payment Attempt")
  - Failure 4 (no retry left): Email (subject: "Service Suspended Due to Non-Payment")

- **Organization Suspension:**
  - After 3 failed retries (day 7), Stripe webhook `customer.subscription.updated` fires with status=UNPAID
  - Update Organizations: status=SUSPENDED
  - Suspend access: Middleware blocks all API requests (except billing settings)
  - Display banner: "Your account is suspended due to non-payment. Update payment method to restore access."
  - Owner can still access billing settings to update card

- **Manual Payment Retry:**
  - Owner updates card on billing settings page
  - Click "Retry Payment" button
  - Trigger Stripe API: `stripe.invoices.pay(invoiceId)`
  - If success: status=ACTIVE, remove suspension
  - If failure: Show error with reason

- **Dunning Success Metrics:**
  - Target: Recover 70% of failed payments within 7 days
  - Track: Failure → success rate per retry attempt

**UI/UX Considerations:**
- Clear email templates with urgency increasing over time
- Billing settings page shows "Payment Failed" status in red
- "Retry Payment" button prominently displayed
- Success message after payment recovery: "Welcome back! Your access is restored."

---

### 4.2 Secondary Features

#### Feature 6: Tax & VAT Handling
**Description:** Automatic tax calculation based on customer location (US sales tax, EU VAT) via Stripe Tax. Collect and remit taxes per jurisdiction requirements.

**Specifications:**
- Enable Stripe Tax for automatic calculation
- Collect VAT numbers from EU customers (validated via VIES)
- Display tax breakdown on invoices (subtotal + VAT = total)
- Reverse charge mechanism for B2B EU customers with valid VAT number

#### Feature 7: Annual Subscription Discount
**Description:** Offer annual billing option with 15% discount ($499/year vs. $588 for 12 monthly payments) to improve cash flow and reduce churn.

**Specifications:**
- Separate Stripe Price IDs for monthly vs. annual
- Plan comparison page shows annual savings
- Allow switching between monthly/annual billing (prorated credit applied)

#### Feature 8: Enterprise Custom Quotes
**Description:** Manual quote generation for ENTERPRISE plans with custom pricing, contract terms, and annual invoicing.

**Specifications:**
- Owner submits "Contact Sales" form for ENTERPRISE tier
- Sales team generates custom Stripe invoice (not subscription)
- Manual approval workflow for pricing and contract terms

#### Feature 9: Credits & Refunds
**Description:** System admin can apply account credits or process refunds for service issues.

**Specifications:**
- Admin panel: "Apply Credit" button (amount, reason)
- Credit stored in Stripe customer balance (applied to next invoice)
- Refund button: Triggers Stripe refund API (partial or full)

---

## 5. Non-Functional Requirements

### 5.1 Performance
- **Checkout Load Time:** Stripe Checkout page loads in <2 seconds
- **Payment Processing Time:** Payment confirmation within 5 seconds of card submission
- **Quota Check Latency:** Usage validation completes in <100ms (no user-perceived delay)
- **Invoice Generation:** PDF invoices generate in <2 seconds

### 5.2 Security
- **PCI DSS Compliance:** All card data handled by Stripe (Level 1 compliant)
- **Webhook Security:** Stripe webhook signatures validated on every request (HMAC verification)
- **Payment Data Storage:** Zero payment data stored in NextCRM database (Stripe stores all)
- **Audit Logging:** All billing changes logged (subscription changes, payment methods, refunds)

### 5.3 Reliability
- **Payment Success Rate:** >99% successful payments on first attempt (Stripe SLA)
- **Webhook Delivery:** Stripe retries webhooks 3x on failure with exponential backoff
- **Dunning Recovery Rate:** >70% of failed payments recovered within 7 days
- **Invoice Delivery:** 100% of successful payments generate invoices

### 5.4 Compliance
- **GDPR:** Payment data stored in Stripe (GDPR-compliant processor), invoices include VAT numbers
- **SOC 2 Type II:** Stripe is SOC 2 certified, audit logs track all billing changes
- **Tax Compliance:** Stripe Tax automatically calculates and remits taxes per jurisdiction
- **Data Retention:** Invoices retained for 10 years (accounting law requirement)

---

## 6. Acceptance Criteria

### Core Functionality
- [ ] User can view plan comparison page showing FREE, PRO, ENTERPRISE tiers with features and pricing
- [ ] Owner can upgrade from FREE to PRO via Stripe Checkout (card payment)
- [ ] Stripe Checkout session creates subscription in Stripe and database (Subscriptions record)
- [ ] Organizations.plan field updates to PRO on successful payment
- [ ] PaymentHistory record created with amount, status=SUCCEEDED, receipt URL
- [ ] Confirmation email sent to owner with invoice PDF attachment
- [ ] Owner can downgrade to FREE (cancelAtPeriodEnd=true, access retained until period end)
- [ ] Subscription cancels at period end (Organizations.plan=FREE)
- [ ] Owner can update payment method via Stripe Elements (PCI-compliant)
- [ ] Owner can view payment methods list (card brand, last 4 digits, expiration date)
- [ ] Owner can set default payment method (used for subscription billing)
- [ ] Owner can remove old payment methods (cannot remove default if subscription active)
- [ ] Invoice PDF generated automatically on payment success
- [ ] Invoice includes line items, VAT breakdown, company tax info
- [ ] Owner can download invoice PDF from billing portal
- [ ] Billing portal shows all historical invoices (date, amount, status, download button)
- [ ] Owner can export all invoices to ZIP file
- [ ] Billing email can be set separately from owner email
- [ ] Usage dashboard shows current usage vs. plan limits (users, contacts, storage, projects, documents)
- [ ] Usage bars color-coded: Green (<70%), Orange (70-90%), Red (>90%)
- [ ] Creating user/contact/project/document blocked when at plan limit
- [ ] Upgrade modal shown when limit reached (with "Upgrade to PRO" CTA)
- [ ] Downgrade from PRO to FREE with over-limit data triggers 7-day grace period
- [ ] Grace period banner displayed with countdown ("Reduce to 5 users in 3 days")
- [ ] After grace period, over-limit records locked (not deleted)

### Payment Retry & Dunning
- [ ] Payment failure triggers Stripe automatic retry (immediately, day 3, day 7)
- [ ] Payment failure updates Subscriptions.status to PAST_DUE
- [ ] Dunning email sent to owner on each failure (with "Update Payment Method" link)
- [ ] Email urgency increases with each retry (final email marked "URGENT")
- [ ] After 3 failed retries, Organizations.status updated to SUSPENDED
- [ ] Suspended organization blocks all API requests (except billing settings)
- [ ] Suspended organization displays banner: "Suspended due to non-payment"
- [ ] Owner can manually retry payment after updating card
- [ ] Successful payment recovery updates status to ACTIVE and removes suspension

### Security
- [ ] All payment data handled by Stripe (zero card data in NextCRM database)
- [ ] Stripe webhook signatures validated on every request (rejects invalid signatures)
- [ ] Audit logs capture all subscription changes (upgrade, downgrade, cancel, payment method updates)

### Compliance
- [ ] Invoices include VAT number (for EU customers)
- [ ] Stripe Tax calculates tax based on customer location
- [ ] Invoices retain for 10 years (accounting compliance)

---

## 7. Success Metrics

| Metric Category | Metric | Target | Measurement Method |
|----------------|--------|--------|-------------------|
| **Conversion** | FREE to PRO upgrade rate | >10% | (PRO signups / Total FREE users) * 100 |
| **Revenue** | Monthly recurring revenue (MRR) | $10K+ by Q2 2025 | Sum of active PRO subscriptions * $49 |
| **Churn** | Voluntary churn rate | <5% per month | (Cancellations / Active subs) * 100 |
| **Dunning** | Failed payment recovery rate | >70% within 7 days | (Recovered payments / Total failures) * 100 |
| **Support** | Billing support tickets | <10 per 1000 customers | Zendesk ticket tagging |
| **Payment Success** | First-attempt payment success rate | >95% | (Successful payments / Total attempts) * 100 |
| **Invoice Delivery** | Invoice email delivery rate | >99% | (Delivered emails / Total sent) * 100 |
| **Upgrade CTAs** | Upgrade modal conversion rate | >20% | (Clicks "Upgrade" / Modal shown) * 100 |

**Key Performance Indicators (KPIs):**
1. **Annual Contract Value (ACV):** $50K+ by end of Q2 2025 (100 PRO customers)
2. **Net Revenue Retention (NRR):** >100% (upgrades exceed downgrades)
3. **Payment Failure Rate:** <3% of total subscription charges

---

## 8. Dependencies

### Internal Dependencies
| Dependency | Type | Status | Impact if Delayed |
|-----------|------|--------|------------------|
| Multi-Tenancy Module | Hard | In Progress | Cannot tie subscriptions to organizations without organizationId |
| User Authentication | Hard | Complete | Cannot identify organization owner for payment |
| Usage Tracking (OrganizationUsage) | Hard | Complete | Cannot enforce quotas without usage data |
| Email Service | Hard | Complete | Cannot send invoices and dunning emails |

### External Dependencies
| Dependency | Provider | SLA | Risk Level |
|-----------|----------|-----|-----------|
| Stripe API | Stripe | 99.99% uptime | Low (industry standard, mature API) |
| Stripe Webhooks | Stripe | 3x retry with backoff | Low (reliable delivery) |
| Stripe Tax | Stripe | Bundled with Stripe | Low (automated tax calculation) |

### Technical Dependencies
- **Stripe SDK:** `@stripe/stripe-js` (frontend), `stripe` Node SDK (backend)
- **Environment Variables:**
  - `STRIPE_SECRET_KEY`: API key for backend operations
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Public key for Stripe Elements
  - `STRIPE_WEBHOOK_SECRET`: Webhook signature verification
- **Webhooks Endpoint:** `/api/webhooks/stripe` (must be publicly accessible for Stripe)

---

## 9. Out of Scope

The following items are explicitly **NOT** included in this release:

- [ ] Usage-based pricing (pay-per-contact, pay-per-storage) (future: metered billing)
- [ ] Multi-currency support beyond USD (future: EUR, GBP pricing)
- [ ] Cryptocurrency payments (Bitcoin, Ethereum) (future: crypto gateway)
- [ ] Offline payment methods (wire transfer, checks) (future: manual invoicing)
- [ ] Reseller/partner pricing tiers (future: channel partner program)
- [ ] Free trial period (14-day trial) (future: trial activation)
- [ ] Add-on marketplace (e.g., buy extra storage, AI requests) (future: à la carte features)
- [ ] Subscription pausing (pause billing for 1-3 months) (future: seasonal businesses)
- [ ] Multi-year contracts with discounts (future: enterprise sales)
- [ ] Purchase orders and Net 30 payment terms (future: enterprise billing)
- [ ] Affiliate/referral commission tracking (future: growth program)
- [ ] Lifetime deals or one-time payments (future: AppSumo-style deals)

**Future Considerations:**
- Usage-based pricing for large organizations (pay per active user/month)
- Free trial with credit card required (reduces fraud)
- Add-on marketplace for premium features (extra storage, AI requests, integrations)

---

## 10. Risks & Mitigation

| Risk | Probability | Impact | Mitigation Strategy | Owner |
|------|------------|--------|-------------------|-------|
| **Stripe API Downtime:** Stripe outage prevents payment processing | Low | High | Cache subscription status locally, allow 24h grace period before blocking access, use Stripe status page for monitoring | Backend Engineer |
| **Payment Fraud:** Stolen cards used to subscribe | Medium | Medium | Enable Stripe Radar (fraud detection), require 3D Secure for high-risk transactions, monitor chargeback rate | Finance Team |
| **Tax Compliance Errors:** Incorrect VAT calculation leads to fines | Low | High | Use Stripe Tax (automated), review invoices quarterly, consult tax attorney for EU markets | Finance Team |
| **Webhook Failures:** Missed webhooks cause incorrect subscription status | Medium | High | Implement webhook retry logic, daily sync job to reconcile Stripe vs. database, monitoring alerts on webhook failures | DevOps Engineer |
| **Failed Payment Recovery:** Dunning emails don't recover enough failed payments | High | Medium | A/B test email copy and timing, offer incentive ($10 credit) for payment method update, monitor recovery rate weekly | Product Manager |
| **Upgrade Friction:** Users abandon upgrade due to complex checkout | Medium | High | Simplify Stripe Checkout (pre-fill email, single-page), A/B test upgrade CTA placement, user testing on checkout flow | UX Designer |

**Risk Categories:**
- **Technical Risks:** Stripe API failures, webhook reliability, database sync issues
- **Business Risks:** Low conversion rates, high churn, fraud/chargebacks
- **Compliance Risks:** Tax calculation errors, invoice formatting issues, data retention

---

## 11. Launch Requirements

### Pre-Launch Checklist

#### Development
- [ ] All acceptance criteria met (100% of checkboxes in section 6)
- [ ] Code review completed by senior engineer + finance team review
- [ ] Unit tests passing with >90% coverage on billing logic
- [ ] Integration tests passing for Stripe workflows (upgrade, downgrade, payment retry)
- [ ] Webhook handling tested with Stripe CLI (local webhook simulation)
- [ ] Load testing completed with 1,000 simultaneous checkouts (no failures)
- [ ] Security audit completed (Stripe keys protected, webhook signature validation)

#### QA
- [ ] Functional testing completed for all subscription workflows (upgrade, downgrade, cancel, reactivate)
- [ ] Payment retry testing completed (3 retries over 7 days)
- [ ] Quota enforcement testing completed (all limits enforced correctly)
- [ ] Invoice generation testing completed (PDF format, email delivery)
- [ ] Tax calculation testing completed (US sales tax, EU VAT)
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] Mobile responsive testing for billing portal and Stripe Checkout

#### Documentation
- [ ] User documentation: "Managing Your Subscription" guide (with screenshots)
- [ ] User documentation: "Understanding Plan Limits" reference
- [ ] Admin guide: "Processing Refunds and Credits"
- [ ] Developer documentation: Stripe integration architecture
- [ ] API documentation: Billing and subscription endpoints
- [ ] Finance runbook: "Monthly Reconciliation Process"

#### Operations
- [ ] Stripe production account configured (live API keys, webhooks)
- [ ] Monitoring configured: Payment success rate, failed payment rate, webhook delivery rate
- [ ] Alerting configured: Webhook failures, payment fraud alerts, dunning recovery rate
- [ ] Daily reconciliation job scheduled (compare Stripe data vs. database)
- [ ] Backup and restore procedure tested for subscription data
- [ ] Incident response runbook ready: "Payment Outage Response"

#### Legal & Compliance
- [ ] Terms of service updated with subscription terms (cancellation policy, refund policy)
- [ ] Privacy policy updated with Stripe data processing addendum
- [ ] Stripe Data Processing Agreement (DPA) signed
- [ ] Tax compliance verified with accountant (VAT collection, Stripe Tax configuration)
- [ ] Invoice format meets accounting standards (reviewed by CPA)

#### Go-to-Market
- [ ] Pricing page published with plan comparison
- [ ] Sales team trained on pricing tiers and upgrade sales
- [ ] Customer support trained on billing troubleshooting (failed payments, invoice downloads)
- [ ] Beta testing completed with 10 paying customers (feedback incorporated)
- [ ] Stripe account approved for production (business verification)

---

## Appendix

### A. Stripe Webhook Events Reference

**Critical Webhooks:**
1. `checkout.session.completed` - Customer completed checkout, create subscription
2. `invoice.payment_succeeded` - Payment succeeded, create PaymentHistory, send invoice email
3. `invoice.payment_failed` - Payment failed, update status to PAST_DUE, send dunning email
4. `customer.subscription.updated` - Subscription changed (plan, status), update database
5. `customer.subscription.deleted` - Subscription cancelled, downgrade to FREE
6. `customer.updated` - Customer payment method updated, sync to database

### B. Database Schema

See [prisma/schema.prisma](../../prisma/schema.prisma):
- `Organizations` model (lines 62-96) - `plan`, `status`, `stripeCustomerId`
- `Subscriptions` model (lines 829-848)
- `PaymentHistory` model (lines 850-865)
- `OrganizationUsage` model (lines 867-886)

### C. Stripe API Specifications

**Key Stripe Objects:**
- `Customer`: Represents organization owner (email, payment methods)
- `Subscription`: Recurring billing (plan, status, current period)
- `Invoice`: Payment request (amount, line items, status)
- `PaymentIntent`: Payment attempt (amount, status, payment method)

**Key API Calls:**
```javascript
// Create Checkout Session
stripe.checkout.sessions.create({
  mode: 'subscription',
  line_items: [{ price: 'price_pro_monthly', quantity: 1 }],
  customer_email: owner.email,
  success_url: 'https://app.nextcrm.io/billing/success',
  cancel_url: 'https://app.nextcrm.io/billing/cancel',
});

// Update Subscription (Downgrade)
stripe.subscriptions.update(subscriptionId, {
  cancel_at_period_end: true,
});

// Retry Failed Payment
stripe.invoices.pay(invoiceId);
```

### D. Related Documents
- [Stripe Documentation: Subscriptions](https://stripe.com/docs/billing/subscriptions/overview)
- [Stripe Documentation: Checkout](https://stripe.com/docs/payments/checkout)
- [NextCRM Multi-Tenancy PRD](./PRD-MULTI-TENANCY.md)

---

## Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-17 | Product Team | Initial draft based on NextCRM billing requirements |

---

## Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Product Manager | TBD | | |
| Engineering Lead | TBD | | |
| Finance Lead | TBD | | |
| Legal | TBD | | |
