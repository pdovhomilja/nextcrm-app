# Data Processing Agreement (DPA)

**Effective Date:** January 15, 2025
**Version:** 1.0

This Data Processing Agreement ("DPA") governs the processing of personal data when you use NextCRM's services, particularly for users and organizations subject to GDPR (General Data Protection Regulation).

---

## 1. Definitions

**Controller:** The organization or individual that determines the purposes and means of processing personal data. You are the Controller for customer data you upload to NextCRM.

**Processor:** The entity that processes personal data on behalf of the Controller. NextCRM acts as a Processor for your data.

**Sub-processor:** Third parties that process data on behalf of the Processor. Listed in Section 5.

**Personal Data:** Any information relating to an identified or identifiable natural person.

**Processing:** Any operation performed on personal data (collection, storage, use, transmission, deletion).

**Data Subject:** The individual whose data is being processed.

---

## 2. Scope & Applicability

This DPA applies when:
- Your organization is in the EU/EEA
- You transfer personal data to NextCRM
- NextCRM processes that data under your instruction
- GDPR Chapter 3 (Articles 28-32) applies

**This DPA does NOT apply to:**
- Data within your own organization (you remain the Controller)
- NextCRM's use of your contact information for service provision (covered by Privacy Policy)
- Anonymized or aggregated data

---

## 3. Processor Obligations

NextCRM commits to:

### 3.1 Data Protection
- Process personal data only on your documented instructions
- Ensure staff confidentiality through contracts
- Maintain security measures (see Section 6)
- Assist with data subject rights requests
- Delete or return data upon termination

### 3.2 Documented Instructions
You provide instructions through:
- Configuration settings in NextCRM
- API calls to NextCRM
- Support requests
- Contractual terms (Terms of Service)

We will not process data beyond these instructions without prior written consent.

### 3.3 Confidentiality
- Employees access data only to provide services
- All staff sign confidentiality agreements
- NDA extends to sub-processors

### 3.4 Sub-processor Management
- We identify all sub-processors (Section 5)
- We require data protection clauses with each
- You have right to object to new sub-processors (30-day notice)

### 3.5 Assistance with Rights
We will:
- Respond to your data subject requests within 5 business days
- Provide tools for data export (Articles 15, 20)
- Facilitate deletion requests (Article 17)
- Provide records of processing (Article 28(3)(e))

**Response SLA:** 5 business days for most requests, 10 days for complex requests

---

## 4. Your Responsibilities as Controller

As the data Controller, you must:

- Ensure lawful basis for processing (Article 6)
- Provide privacy notices to data subjects (Article 13/14)
- Comply with data subject rights requests
- Report data breaches to authorities
- Conduct Data Protection Impact Assessments (DPIA) if needed
- Ensure data is accurate and up-to-date
- Implement appropriate organizational measures

---

## 5. Sub-processors

NextCRM uses the following sub-processors to provide services:

### 5.1 Infrastructure & Hosting
**AWS (Amazon Web Services)**
- Purpose: Cloud hosting, data storage, backups
- Data: All customer data, documents, emails
- Location: US (primary), EU (backup)
- DPA: Standard Contractual Clauses (SCCs)
- Privacy: https://aws.amazon.com/privacy

**DigitalOcean**
- Purpose: Document and file storage
- Data: Uploaded documents and files
- Location: United States
- DPA: SCCs in place
- Privacy: https://www.digitalocean.com/legal/privacy/

### 5.2 Payment Processing
**Stripe Inc.**
- Purpose: Payment processing
- Data: Billing address, transaction records (NOT full credit cards)
- Location: United States
- DPA: Stripe DPA available at https://stripe.com/en-ie/privacy
- Certification: PCI DSS Level 1 certified

### 5.3 File & Email Services
**UploadThing**
- Purpose: File upload and temporary storage
- Data: Documents uploaded by users
- Location: United States
- DPA: Available upon request

**SendGrid/Resend**
- Purpose: Transactional email delivery
- Data: Email addresses, email content
- Location: United States
- DPA: SendGrid DPA available at https://sendgrid.com/policies/data-processing-addendum/

### 5.4 Analytics & Monitoring
**Sentry**
- Purpose: Error tracking and performance monitoring
- Data: Error logs, session identifiers (anonymized)
- Location: United States
- DPA: SCCs in place
- Privacy: https://sentry.io/privacy/

**Google Analytics**
- Purpose: Website analytics (anonymized)
- Data: Aggregated usage data
- Location: United States
- DPA: Google Analytics DPA available

### 5.5 Adding New Sub-processors

We will notify you 30 days before engaging new sub-processors. You have the right to object on reasonable data protection grounds. If you object, you may terminate your account.

---

## 6. Security Measures (Annex II)

NextCRM implements:

### 6.1 Technical Measures
- **Encryption in Transit:** TLS 1.2+ (HTTPS only, no unencrypted HTTP)
- **Encryption at Rest:** AES-256 encryption
- **Database Security:** Encrypted databases with access controls
- **Authentication:** JWT tokens with 24-hour expiration
- **Access Control:** Role-based access control (RBAC)
- **Network:** Firewalls, DDoS protection, Web Application Firewall (WAF)
- **Monitoring:** 24/7 intrusion detection

### 6.2 Organizational Measures
- **Access Control:** Employees access only necessary data
- **Employees:** Background checks, confidentiality agreements
- **Training:** Annual security and privacy training
- **Incident Response:** Documented procedures, 1-hour response time
- **Vendor Management:** Quarterly reviews of sub-processors
- **Audits:** Annual penetration testing and security audits
- **SOC 2:** Type II certification (annual)

### 6.3 Data Pseudonymization
Where possible, we:
- Use user IDs instead of names
- Anonymize analytics data
- Hash sensitive identifiers

### 6.4 Resilience & Recovery
- **Backups:** Automated daily backups
- **Retention:** 30-day backup retention
- **Recovery Time Objective (RTO):** 4 hours
- **Recovery Point Objective (RPO):** 24 hours
- **Testing:** Quarterly backup restoration tests
- **Geographic Redundancy:** US primary, EU backup

### 6.5 Testing & Improvement
- **Vulnerability Testing:** Quarterly penetration tests
- **Security Updates:** Patched within 48 hours
- **Continuous Improvement:** Ongoing security enhancements
- **Incident Reviews:** Post-incident improvements

---

## 7. International Data Transfers

### 7.1 EU to US Transfers
Personal data of EU residents is transferred to the US for processing. We rely on:

**Standard Contractual Clauses (SCCs):**
- NextCRM-AWS: SCCs in place
- NextCRM-Stripe: SCCs in place
- Other processors: SCCs required

**Supplementary Measures:**
- Data encrypted in transit (TLS)
- Data encrypted at rest (AES-256)
- Minimal data exposure (data minimization)
- Access controls

### 7.2 Adequacy Decisions
Where available (e.g., for UK data), we rely on adequacy decisions.

### 7.3 Your Responsibility
If you have concerns about international transfers, you may:
- Request data residency within EU (ENTERPRISE only)
- Request deletion instead of transfer
- Terminate the agreement

---

## 8. Data Subject Rights

NextCRM assists you in responding to data subject rights requests:

### 8.1 Right to Access (Article 15)
- You can request all data about a person
- We provide export function (Settings > Export My Data)
- We respond within 10 business days

### 8.2 Right to Rectification (Article 16)
- Users can update their own data in Settings
- We provide tools for data correction
- Response: 5 business days

### 8.3 Right to Erasure (Article 17)
- Users can delete their account
- 30-day grace period (can cancel)
- Permanent deletion after 30 days
- Response: Immediate processing

### 8.4 Right to Data Portability (Article 20)
- Export function available (Settings > Export My Data)
- Data format: ZIP file with JSON/CSV
- Response: 10 business days

### 8.5 Right to Object (Article 21)
- Opt-out of marketing: Email privacy@nextcrm.io
- Opt-out of analytics: In Settings
- Response: Immediate

### 8.6 Processing Restrictions (Article 18)
- We can temporarily restrict processing
- Request via privacy@nextcrm.io
- Response: 5 business days

---

## 9. Personal Data Breach Notification

### 9.1 Your Notification Rights
If we discover a breach involving your data, we will:
- Notify you without undue delay
- Provide details of the breach
- Explain measures taken
- Response time: Within 24 hours of discovery

### 9.2 Your Obligations
You are responsible for:
- Notifying data subjects (if required by GDPR)
- Notifying authorities (where applicable)
- We will provide assistance as needed

### 9.3 Investigation & Remediation
We will:
- Investigate the breach
- Implement preventative measures
- Provide incident report
- Cooperate with authorities

---

## 10. Data Return or Deletion

### 10.1 Upon Termination
When your account is deleted or expires:
- Data is deleted from production systems immediately
- Backups deleted after 30 days
- Audit logs retained for 7 years (legal requirement)
- Certification of deletion provided upon request

### 10.2 Export Before Deletion
You can export data anytime (Settings > Export My Data):
- Get download link via email
- Valid for 7 days
- All your data in portable format

### 10.3 Certified Deletion
On request, we will:
- Certify deletion in writing
- Confirm deletion from all systems and backups
- Available at no additional cost

---

## 11. Audit Rights

### 11.1 Your Audit Rights
You have the right to:
- Audit our processing
- Request security certifications (SOC 2, penetration test results)
- Request records of processing

### 11.2 Audit Process
- Request via legal@nextcrm.io
- We will provide available certifications
- On-site audits available for ENTERPRISE customers
- Reasonable notice required (14 days)
- Frequency: Once per year (or as required)

### 11.3 Certifications Available
- SOC 2 Type II (annual)
- Penetration Test Results (annual)
- Security Audit (quarterly)
- Incident Reports (30 days)

---

## 12. Limitations & Conditions

This DPA is subject to:

### 12.1 Data Minimization
- Collect only necessary data
- You are responsible for ensuring data appropriateness
- We don't control what data you upload

### 12.2 Lawful Basis
- You ensure lawful basis (Article 6)
- You provide privacy notices
- You handle data subject rights

### 12.3 Prohibited Uses
You cannot process:
- Special category data (Article 9) without explicit consent
- Criminal records (Article 10) without authorization
- Children's data (under 16) without parental consent

---

## 13. Liability & Indemnification

### 13.1 Processor Liability
We are liable for:
- Breaches of this DPA
- Unauthorized processing
- Security failures
- Failure to assist with rights

### 13.2 Limitation
Liability capped at:
- 12 months of fees paid
- Or actual damages, whichever is lower

### 13.3 Exceptions
Liability not limited for:
- Data breaches due to our negligence
- Unauthorized data transfers
- Breach of confidentiality

---

## 14. Duration & Amendment

### 14.1 Duration
This DPA is effective while you use NextCRM and continues for 2 years after termination (for audit purposes).

### 14.2 Changes
We may update this DPA:
- Material changes: 30-day notice
- Non-material changes: Effective immediately
- Continued use = acceptance

---

## 15. Contact Information

**Data Protection Inquiries:**
- Email: privacy@nextcrm.io
- Response time: 30 days

**Legal & DPA Questions:**
- Email: legal@nextcrm.io
- Response time: 10 business days

**Data Breach Notification:**
- Email: privacy@nextcrm.io (urgent)
- Phone: Available for ENTERPRISE
- Response: Within 24 hours

---

## Annex A: Standard Contractual Clauses (SCCs)

NextCRM's processors are bound by Standard Contractual Clauses under:
- EU Commission Decision 2004/915/EC
- EU Commission Decision 2010/87/EU

Text available at: https://ec.europa.eu/info/law/law-topic/data-protection/international-dimension-data-protection/standard-contractual-clauses-scc_en

All sub-processors have signed SCCs incorporating these standard clauses.

---

**Document Version:** 1.0
**Effective Date:** January 15, 2025

For questions, contact: legal@nextcrm.io
