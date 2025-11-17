# Cookie Policy

**Effective Date:** January 15, 2025
**Last Updated:** January 15, 2025

## 1. What Are Cookies?

Cookies are small text files stored on your device (computer, phone, tablet) when you visit a website. They contain information that helps websites remember you and provide customized experiences.

### Types of Cookies by Duration:
- **Session Cookies:** Deleted when you close your browser
- **Persistent Cookies:** Remain on your device for a set period
- **First-Party Cookies:** Set by the website you're visiting
- **Third-Party Cookies:** Set by other domains

### Cookie Components:
- Name: Identifier for the cookie
- Value: Data stored in the cookie
- Expiration: When the cookie is deleted
- Domain: Which websites can access it
- Path: Which pages can access it

---

## 2. Cookies We Use

NextCRM uses cookies for essential functionality and analytics. Below is our complete cookie list:

### 2.1 Strictly Necessary Cookies (No Consent Required)

These cookies are **essential** for NextCRM to function. You **cannot disable** them without breaking the service.

| Cookie Name | Purpose | Duration | Required |
|------------|---------|----------|----------|
| **__session** | Session management, user authentication | Session (until logout) | ✅ Yes |
| **sessionToken** | JWT token storage, API authentication | 24 hours | ✅ Yes |
| **organizationId** | Current organization context | Session | ✅ Yes |
| **csrf_token** | CSRF protection, form security | Session | ✅ Yes |
| **_next** | Next.js framework cookie | Session | ✅ Yes |
| **dark_mode** | UI theme preference (light/dark) | 1 year | ✅ Yes |
| **language** | Preferred language setting | 1 year | ✅ Yes |

**What we use them for:**
- Keep you logged in
- Secure your account
- Prevent unauthorized access
- Remember your preferences
- Enable forms and features

**What we don't do:**
- Share with third parties
- Track across websites
- Identify you across the internet

---

### 2.2 Performance & Analytics Cookies (Consent Optional)

These cookies help us understand how you use NextCRM and improve it. You **can disable** them without breaking the service.

| Cookie Name | Service | Purpose | Duration |
|------------|---------|---------|----------|
| **_ga** | Google Analytics | Track user sessions | 2 years |
| **_ga_ID** | Google Analytics | User identification | 2 years |
| **_gid** | Google Analytics | Session tracking | 24 hours |
| **_gat** | Google Analytics | Request throttling | 1 minute |
| **pageview_count** | NextCRM internal | Page views for analytics | 30 days |
| **feature_usage** | NextCRM internal | Feature usage tracking | 30 days |

**What we use them for:**
- Count page views
- Understand which features are popular
- Measure application performance
- Identify performance issues
- Improve user experience

**What we don't do:**
- Track personal identity
- Share with ad networks
- Use for profiling
- Share with advertisers

**Disable option:**
- In NextCRM: Settings > Privacy > Disable analytics
- In browser: Google Analytics opt-out extension

---

### 2.3 Email Tracking Cookies (Consent Required)

When you send emails through NextCRM's email integration, we use tracking pixels to measure engagement.

| Cookie Name | Purpose | Duration |
|------------|---------|----------|
| **nextcrm_email_tracking_id** | Track email opens | Session |
| **nextcrm_click_tracking** | Track link clicks | Session |

**What we use them for:**
- Know when recipient opens email (open tracking)
- Know when recipient clicks links (click tracking)
- Measure email campaign effectiveness
- Provide engagement metrics

**Important limitations:**
- ~30-40% of email clients block tracking pixels
- Outlook and Gmail often block pixels
- Corporate firewalls may block
- Tracking accuracy: ~95% where visible
- No tracking of email content

**Disable option:**
- Settings > Email > Disable tracking
- Opt-out of email feature entirely

---

### 2.4 Third-Party Cookies

Third-party cookies are set by services NextCRM uses:

#### Stripe (Payment Processing)
| Cookie | Purpose | Provider |
|--------|---------|----------|
| **__Host-stripe_api_key** | Payment processing | Stripe |
| **__Host-Stripe.SessionId** | Payment session | Stripe |

**Use:** Securely process credit card payments
**Disable:** Not recommended; breaks payments
**Privacy:** https://stripe.com/privacy

#### Google OAuth
| Cookie | Purpose | Provider |
|--------|---------|----------|
| **g_state** | OAuth session | Google |
| **1P_JAR** | Cookie consent, security | Google |

**Use:** Google sign-in authentication
**Disable:** Won't affect NextCRM (cookies set during login)
**Privacy:** https://policies.google.com/privacy

---

## 3. Cookie Consent & Management

### 3.1 Consent Model

**No Consent Required For:**
- Essential cookies (session, authentication)
- Service functionality cookies
- User preference cookies
- Security cookies

**Consent Required For:**
- Analytics cookies (optional, non-essential)
- Email tracking (explicit opt-in)
- Marketing cookies (none currently used)
- Third-party cookies (disclosed below)

### 3.2 How to Manage Cookies

**In NextCRM Settings:**
1. Go to Settings > Privacy
2. Toggle "Analytics cookies" ON/OFF
3. Toggle "Email tracking" ON/OFF
4. Toggle "Marketing communications" ON/OFF
5. Changes take effect immediately

**In Your Browser:**
1. Settings > Privacy & Security > Cookies
2. Find nextcrm.io
3. View and delete specific cookies
4. Or use "Block all cookies from this site"

**Browser Options:**
- **Chrome:** Settings > Privacy and security > Cookies
- **Firefox:** Settings > Privacy & Security > Cookies and Site Data
- **Safari:** Preferences > Privacy > Manage Website Data
- **Edge:** Settings > Privacy, search, and services > Cookies

### 3.3 Cookie Preferences by Type

| Type | Recommended | Consent | Impact if Disabled |
|------|-------------|---------|-------------------|
| Strictly Necessary | ✅ Enable | Not required | Service won't work |
| Performance/Analytics | ✅ Enable | Optional | We can't improve service |
| Email Tracking | ⚠️ Optional | Required | No open/click data |
| Third-Party (Stripe) | ✅ Enable (for payments) | Optional | Payments won't work |

---

## 4. Third-Party Cookies Detail

### 4.1 Google Analytics

**Cookies Set:**
- _ga (2 years)
- _ga_ID (2 years)
- _gid (24 hours)
- _gat (1 minute)

**Data Collected:**
- Pages viewed
- Time on site
- Browser type
- Device type
- Approximate location (country, city)
- Traffic source

**Data NOT Collected:**
- Personal identity
- Email addresses
- Personal information
- Cross-site browsing

**Privacy:** https://policies.google.com/privacy

**Opt-Out:**
- https://tools.google.com/dlpage/gaoptout (browser extension)
- In NextCRM: Settings > Privacy > Disable analytics

### 4.2 Stripe Cookies

**Cookies Set:**
- __Host-stripe_api_key
- __Host-Stripe.SessionId

**Data Collected:**
- Payment transactions only
- Not stored in our system

**Privacy:** https://stripe.com/privacy

**Note:** Cannot be disabled for payment processing to work

### 4.3 Sentry Cookies

**Use:** Error tracking and monitoring
**Data:** Anonymous error logs, session IDs (no personal data)
**Privacy:** https://sentry.io/privacy/

**Note:** Cookies set only when errors occur

---

## 5. Cookies in Different Scenarios

### 5.1 New User Registration

When you sign up:
1. **sessionToken** set - Authentication
2. **organizationId** set - Your organization
3. **dark_mode** set - Default theme
4. **language** set - Browser language
5. **_ga** set - Analytics (if enabled)

### 5.2 Email Integration

When you connect email:
1. **sessionToken** used - OAuth authentication
2. **nextcrm_email_tracking_id** - Email tracking (if enabled)

### 5.3 Payment Processing

When you upgrade plan:
1. **__Host-stripe_api_key** - Secure payment
2. **__Host-Stripe.SessionId** - Payment session
3. Cookies deleted after payment completes

---

## 6. Data Storage & Security

### 6.1 Where Cookies Are Stored
- **Your Device:** Browser storage (your computer)
- **Our Servers:** Session data in encrypted database
- **Third Parties:** Google Analytics, Stripe (see their privacy policies)

### 6.2 Security Measures
- **Encryption:** All cookies transmitted via HTTPS
- **HttpOnly Flag:** Cookies inaccessible to JavaScript (prevents theft)
- **Secure Flag:** Cookies only sent over HTTPS
- **SameSite:** Set to "Strict" (prevents CSRF)

### 6.3 Cookie Expiration
- **Session Cookies:** Deleted when browser closes
- **Persistent Cookies:** Automatically deleted at expiration
- **Manual Deletion:** Clear cookies anytime in Settings

---

## 7. Legal Basis for Cookies

Under GDPR and similar laws:

### Strictly Necessary Cookies
- **Legal Basis:** Contractual performance (providing the service)
- **Consent:** Not required
- **GDPR Article:** 6(1)(b)

### Analytics Cookies
- **Legal Basis:** Legitimate interest (improve service)
- **Consent:** Required (we collect consent)
- **GDPR Article:** 6(1)(f)

### Email Tracking
- **Legal Basis:** User consent (opt-in required)
- **Consent:** Explicitly required
- **GDPR Article:** 6(1)(a)

---

## 8. Your Cookie Rights

### 8.1 Right to Know
You have the right to know:
- What cookies we set
- Why we set them
- Who can access them
- How long they're stored

**This policy provides all that information.**

### 8.2 Right to Control
You have the right to:
- Accept or reject non-essential cookies
- Delete cookies from your device anytime
- Manage preferences in Settings
- Change browser cookie settings

### 8.3 Right to Opt-Out
You can opt-out of:
- Analytics: Settings > Privacy > Disable analytics
- Email tracking: Settings > Email > Disable tracking
- Marketing: Settings > Communications > Unsubscribe

### 8.4 Right to Be Forgotten
After account deletion:
- All cookies deleted
- No cookies resume for you
- 30-day grace period for recovery
- Complete deletion after 30 days

---

## 9. Cookie Policy Updates

We may update this policy when:
- Cookies added or removed
- Purposes change
- Law requires updates
- Third-party services change

**Notification:** Updates posted here with effective date
**Continued Use:** Using NextCRM after updates = acceptance

---

## 10. Questions About Cookies?

### Contact Information

**Cookie Questions:**
- Email: privacy@nextcrm.io
- Response time: 30 days

**Privacy Policy (general):**
- Email: privacy@nextcrm.io

**Technical Support:**
- Email: support@nextcrm.io

**Legal Questions:**
- Email: legal@nextcrm.io

---

## Cookie Glossary

**Cookie:** Small text file stored on your device
**Domain:** Website that can access the cookie
**Duration:** How long before cookie expires
**Expiration:** Date/time cookie is deleted
**First-party:** Set by the website you're visiting
**HttpOnly:** Cannot be accessed by JavaScript
**Path:** Website path where cookie applies
**Persistent:** Remains after browser closes
**Secure:** Only sent over HTTPS
**SameSite:** Restricts cross-site cookie access
**Session:** Deleted when browser closes
**Third-party:** Set by external service
**Tracking:** Monitoring user activity
**Token:** Authentication proof

---

**Version:** 1.0
**Effective Date:** January 15, 2025

For questions: privacy@nextcrm.io
