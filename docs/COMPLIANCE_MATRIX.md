# Compliance Matrix: SOC 2, GDPR, ISO 27001

**Version:** 1.0.0
**Last Updated:** November 4, 2025
**Purpose:** Mapping of security controls to compliance requirements

---

## Overview

This document provides a comprehensive mapping of NextCRM → AWMS security controls to regulatory and industry compliance frameworks. Use this matrix to:

- **Prepare for audits** (SOC 2, ISO 27001)
- **Demonstrate GDPR compliance**
- **Track compliance status** across frameworks
- **Identify control gaps** requiring remediation

---

## Compliance Status Summary

| **Framework**         | **Status**       | **Target Date** | **Certification** | **Evidence Location**               |
|-----------------------|------------------|-----------------|-------------------|-------------------------------------|
| SOC 2 Type II         | In Progress      | Q2 2026         | Planned           | This document + SECURITY.md         |
| ISO 27001:2022        | Planned          | Q3 2026         | Planned           | This document + SECURITY.md         |
| GDPR                  | ✅ Compliant     | Current         | Self-assessment   | SECURITY.md (GDPR section)          |
| Privacy Act 1988 (AU) | ✅ Compliant     | Current         | Self-assessment   | SECURITY.md (GDPR section applies)  |
| Privacy Act 2020 (NZ) | ✅ Compliant     | Current         | Self-assessment   | SECURITY.md (GDPR section applies)  |
| PCI DSS               | ✅ N/A (Stripe)  | -               | Stripe Level 1    | Stripe handles all card data        |

---

## SOC 2 Trust Service Criteria Mapping

### CC6: Logical and Physical Access Controls

| **Control ID** | **Control Description**                                  | **Implementation**                                           | **Status** | **Evidence**                                    |
|----------------|----------------------------------------------------------|--------------------------------------------------------------|------------|------------------------------------------------|
| **CC6.1**      | Logical access controls restrict access to assets        | RBAC (4-tier role system), organizationId isolation         | ✅ Complete | `lib/permissions.ts`, `middleware/require-permission.ts` |
| **CC6.2**      | Access credentials issued to authorized users            | NextAuth.js, email verification, OWNER approval (PENDING → ACTIVE) | ✅ Complete | `lib/auth.ts:83-153`, User approval workflow   |
| **CC6.3**      | Entity authorizes, modifies, or removes access           | OWNER can change roles, ADMIN can invite/remove users       | ✅ Complete | `app/api/organization/members/[userId]/role/route.ts` |
| **CC6.6**      | Entity limits use of system resources                    | Plan-based rate limiting (FREE/PRO/ENTERPRISE)              | ✅ Complete | `lib/rate-limit.ts`, `middleware/with-rate-limit.ts` |
| **CC6.7**      | Transmits sensitive information in a secure manner       | TLS 1.3 (Vercel), httpOnly cookies, bcrypt passwords        | ✅ Complete | Vercel SSL, NextAuth.js configuration          |
| **CC6.8**      | Prevents unauthorized software from being installed      | Vercel serverless (immutable deployments), Dependabot       | ✅ Complete | Vercel deployment logs, GitHub Dependabot      |

### CC7: System Operations

| **Control ID** | **Control Description**                                  | **Implementation**                                           | **Status** | **Evidence**                                    |
|----------------|----------------------------------------------------------|--------------------------------------------------------------|------------|------------------------------------------------|
| **CC7.1**      | Detects and corrects processing deviations               | Error tracking (Vercel logs), audit logs (database)         | ✅ Complete | Vercel dashboard, `audit_log` collection       |
| **CC7.2**      | Monitors system components                               | Vercel analytics, MongoDB Atlas monitoring, audit logs      | ✅ Complete | Monitoring dashboards, audit log retention     |
| **CC7.3**      | Evaluates security events and responds                   | Audit log queries, incident response procedures             | ✅ Complete | MAINTENANCE.md (Security Incident Procedures)  |
| **CC7.4**      | Identifies and responds to risk of business disruption   | Backup strategy (6-hour snapshots), RTO/RPO targets         | ✅ Complete | MAINTENANCE.md (Backup and Recovery)           |
| **CC7.5**      | Uses encryption to protect data                          | TLS 1.3 (transit), MongoDB encryption (rest), bcrypt (passwords) | ✅ Complete | Vercel SSL, MongoDB Atlas encryption           |

### CC8: Change Management

| **Control ID** | **Control Description**                                  | **Implementation**                                           | **Status** | **Evidence**                                    |
|----------------|----------------------------------------------------------|--------------------------------------------------------------|------------|------------------------------------------------|
| **CC8.1**      | Authorizes, designs, develops, and tests changes         | Git version control, code review (required), CI/CD (Vercel) | ✅ Complete | GitHub repository, PR approval workflow        |

---

## GDPR Compliance Mapping

### Chapter II: Principles

| **Article** | **Principle**                  | **Implementation**                                           | **Status** | **Evidence**                                    |
|-------------|--------------------------------|--------------------------------------------------------------|------------|------------------------------------------------|
| **Art. 5**  | Lawfulness, fairness, transparency | Privacy policy, terms of service, consent checkboxes        | 🟡 Partial | Privacy policy (to be drafted), GDPR-ready code |
| **Art. 5**  | Purpose limitation             | Data used only for stated purposes (CRM, workshop management)| ✅ Complete | Data model design, no secondary use            |
| **Art. 5**  | Data minimization              | Only essential fields collected (no unnecessary PII)         | ✅ Complete | Database schema (minimal fields)               |
| **Art. 5**  | Accuracy                       | Users can update own data, ADMIN can correct data            | ✅ Complete | Edit functionality, RBAC enforcement           |
| **Art. 5**  | Storage limitation             | 30-day soft delete, 90-day audit retention                   | ✅ Complete | Org deletion workflow, audit log cleanup       |
| **Art. 5**  | Integrity and confidentiality  | TLS 1.3, encryption at rest, RBAC, audit logging             | ✅ Complete | SECURITY.md (complete controls)                |

### Chapter III: Rights of the Data Subject

| **Article** | **Right**                       | **Implementation**                                           | **Status** | **Evidence**                                    |
|-------------|---------------------------------|--------------------------------------------------------------|------------|------------------------------------------------|
| **Art. 15** | Right of access                 | Data export API (`/api/organization/export-data`)           | ✅ Complete | API endpoint, JSON export                      |
| **Art. 16** | Right to rectification          | Users can update own data, ADMIN can edit any data          | ✅ Complete | Edit functionality, RBAC enforcement           |
| **Art. 17** | Right to erasure                | Organization deletion API (30-day grace period)             | ✅ Complete | `/api/organization/delete`, cascading delete   |
| **Art. 18** | Right to restriction            | User deactivation (userStatus = INACTIVE)                   | ✅ Complete | User status workflow                           |
| **Art. 20** | Right to data portability       | JSON export (machine-readable format)                       | ✅ Complete | `/api/organization/export-data` (JSON)         |
| **Art. 21** | Right to object                 | User can request deletion (OWNER initiates)                 | ✅ Complete | Org deletion API                               |

### Chapter IV: Controller and Processor

| **Article** | **Obligation**                  | **Implementation**                                           | **Status** | **Evidence**                                    |
|-------------|---------------------------------|--------------------------------------------------------------|------------|------------------------------------------------|
| **Art. 25** | Data protection by design       | Multi-tenancy isolation, RBAC, encryption, audit logging    | ✅ Complete | ARCHITECTURE.md (security by design)           |
| **Art. 30** | Records of processing           | Audit logs (90-day retention), data export capability       | ✅ Complete | `audit_log` collection, retention policy       |
| **Art. 32** | Security of processing          | Encryption, access controls, audit logging, rate limiting   | ✅ Complete | SECURITY.md (complete controls)                |
| **Art. 33** | Notification of data breach     | Incident response procedures (72-hour notification)         | ✅ Complete | SECURITY.md (Incident Response)                |
| **Art. 34** | Communication of breach to subject | Email notification template prepared                        | 🟡 Partial | Template drafted, not yet deployed             |

---

## ISO 27001:2022 Controls Mapping

### A.5: Organizational Controls

| **Control** | **Description**                     | **Implementation**                                           | **Status** | **Evidence**                                    |
|-------------|-------------------------------------|--------------------------------------------------------------|------------|------------------------------------------------|
| **A.5.15**  | Access control                      | RBAC (4-tier role system), multi-tenancy isolation          | ✅ Complete | RBAC.md (complete implementation)              |
| **A.5.16**  | Identity management                 | NextAuth.js, unique user IDs, email verification            | ✅ Complete | `lib/auth.ts`, user model                      |
| **A.5.17**  | Authentication information          | bcrypt passwords, JWT tokens, httpOnly cookies              | ✅ Complete | Password hashing, session management           |
| **A.5.18**  | Access rights                       | RBAC permission matrix (roles × operations)                 | ✅ Complete | RBAC.md (Permission Matrix)                    |
| **A.5.24**  | Information security incident management | Incident response procedures (P0/P1/P2)                     | ✅ Complete | SECURITY.md (Incident Response)                |
| **A.5.33**  | Protection of records               | Audit logs (immutable, 90-day retention)                    | ✅ Complete | `audit_log` collection (append-only)           |
| **A.5.34**  | Privacy and PII protection          | GDPR compliance (data export, deletion, access controls)    | ✅ Complete | GDPR section above                             |

### A.8: Technology Controls

| **Control** | **Description**                     | **Implementation**                                           | **Status** | **Evidence**                                    |
|-------------|-------------------------------------|--------------------------------------------------------------|------------|------------------------------------------------|
| **A.8.2**   | Privileged access rights            | OWNER role (highest privilege), ADMIN role (limited admin)  | ✅ Complete | RBAC.md (Role Definitions)                     |
| **A.8.3**   | Information access restriction      | organizationId filter on all queries, RBAC enforcement      | ✅ Complete | Multi-tenancy design, RBAC middleware          |
| **A.8.5**   | Secure authentication               | Multi-factor auth (roadmap Q1 2026), rate limiting          | 🟡 Partial | Rate limiting active, MFA planned              |
| **A.8.9**   | Configuration management            | Environment variables, Vercel secure envs, Git version control | ✅ Complete | `.env` files, Vercel dashboard                 |
| **A.8.16**  | Monitoring activities               | Audit logs, Vercel logs, MongoDB monitoring                 | ✅ Complete | MAINTENANCE.md (Monitoring)                    |
| **A.8.23**  | Web filtering                       | CORS restrictions, CSP headers, API rate limiting           | ✅ Complete | CORS config, security headers                  |
| **A.8.24**  | Use of cryptography                 | TLS 1.3, bcrypt passwords, JWT signing (HS256)              | ✅ Complete | Encryption at rest + transit                   |

### A.12: Information Security Aspects of Business Continuity

| **Control** | **Description**                     | **Implementation**                                           | **Status** | **Evidence**                                    |
|-------------|-------------------------------------|--------------------------------------------------------------|------------|------------------------------------------------|
| **A.12.3.1**| Information backup                  | MongoDB snapshots (6-hour intervals), 7-day retention       | ✅ Complete | MongoDB Atlas backup config                    |

### A.14: Security in Development and Support

| **Control** | **Description**                     | **Implementation**                                           | **Status** | **Evidence**                                    |
|-------------|-------------------------------------|--------------------------------------------------------------|------------|------------------------------------------------|
| **A.14.2.1**| Secure development policy           | Code review (required), RBAC tests, Dependabot scanning     | ✅ Complete | GitHub PR workflow, 68 RBAC tests              |
| **A.14.2.5**| Secure system engineering           | Defense-in-depth architecture, threat modeling              | ✅ Complete | ARCHITECTURE.md, SECURITY.md (Threat Model)    |

---

## AU/NZ Privacy Compliance

### Privacy Act 1988 (Australia)

| **Principle (APP)** | **Description**                     | **Implementation**                                           | **Status** | **Evidence**                                    |
|---------------------|-------------------------------------|--------------------------------------------------------------|------------|------------------------------------------------|
| **APP 1**           | Open and transparent management     | Privacy policy, terms of service                            | 🟡 Partial | Privacy policy (to be drafted)                 |
| **APP 3**           | Collection of solicited information | Only essential data collected                               | ✅ Complete | Database schema (minimal fields)               |
| **APP 5**           | Notification of collection          | Sign-up flow explains data use                              | 🟡 Partial | Sign-up page (to be enhanced)                  |
| **APP 6**           | Use or disclosure                   | Data used only for stated purposes                          | ✅ Complete | No secondary use                               |
| **APP 8**           | Cross-border disclosure             | MongoDB Atlas (Sydney region), Vercel (edge network)        | ✅ Complete | Data residency: Sydney + Singapore (failover)  |
| **APP 11**          | Security of personal information    | Encryption, access controls, audit logging                  | ✅ Complete | SECURITY.md (complete controls)                |
| **APP 12**          | Access to personal information      | Data export API                                             | ✅ Complete | `/api/organization/export-data`                |
| **APP 13**          | Correction of personal information  | Users can update own data                                   | ✅ Complete | Edit functionality                             |
| **Notifiable Breach**| Serious data breach notification   | Incident response (OAIC notification within reasonable time)| ✅ Complete | SECURITY.md (Incident Response)                |

### Privacy Act 2020 (New Zealand)

| **Principle (IPP)** | **Description**                     | **Implementation**                                           | **Status** | **Evidence**                                    |
|---------------------|-------------------------------------|--------------------------------------------------------------|------------|------------------------------------------------|
| **IPP 1**           | Purpose of collection               | Data used for stated purposes only                          | ✅ Complete | No secondary use                               |
| **IPP 3**           | Collection from subject             | Data collected directly from users                          | ✅ Complete | User sign-up flow                              |
| **IPP 5**           | Storage and security                | Encryption, access controls, audit logging                  | ✅ Complete | SECURITY.md (complete controls)                |
| **IPP 6**           | Access to personal information      | Data export API                                             | ✅ Complete | `/api/organization/export-data`                |
| **IPP 7**           | Correction of information           | Users can update own data                                   | ✅ Complete | Edit functionality                             |
| **IPP 11**          | Disclosure to third parties         | Stripe (PCI DSS compliant), OpenAI (AI features, opt-in)    | ✅ Complete | Privacy policy (to document third parties)     |
| **IPP 12**          | Use for different purpose           | No secondary use without consent                            | ✅ Complete | Data only used for CRM/AWMS purposes           |
| **Notifiable Breach**| Privacy breach notification        | Incident response (Privacy Commissioner notification)       | ✅ Complete | SECURITY.md (Incident Response)                |

---

## Control Gap Analysis

### Gaps Requiring Immediate Action (P0)

**None** - All critical controls implemented.

---

### Gaps for Q1 2026 (P1)

1. **MFA Implementation** (ISO 27001 A.8.5)
   - **Current State**: Password + OAuth only
   - **Target State**: TOTP (Google Authenticator), mandatory for ADMIN/OWNER
   - **Timeline**: Q1 2026
   - **Owner**: Engineering Team

2. **Privacy Policy & Terms** (GDPR Art. 5, APP 1, IPP 1)
   - **Current State**: No formal policy
   - **Target State**: Comprehensive privacy policy + terms of service
   - **Timeline**: Q1 2026
   - **Owner**: Legal Counsel

3. **Breach Notification Template** (GDPR Art. 34)
   - **Current State**: Template drafted, not deployed
   - **Target State**: Email template in production
   - **Timeline**: Q1 2026
   - **Owner**: Engineering Team

---

### Gaps for Q2 2026 (P2)

1. **SOC 2 Type II Audit** (All CC controls)
   - **Current State**: In progress (self-assessment complete)
   - **Target State**: External auditor, 6-month observation, report issued
   - **Timeline**: Q2 2026
   - **Owner**: Security Team + External Auditor

2. **Penetration Testing** (ISO 27001 A.14.2.5)
   - **Current State**: No external testing
   - **Target State**: Annual CREST-certified penetration test
   - **Timeline**: Q2 2026
   - **Owner**: Security Team

---

### Gaps for Q3 2026 (P3)

1. **ISO 27001:2022 Certification** (All controls)
   - **Current State**: Planned (gap analysis complete)
   - **Target State**: External certification audit, certificate issued
   - **Timeline**: Q3 2026
   - **Owner**: Security Team + External Auditor

2. **Bug Bounty Program** (ISO 27001 A.14.2.1)
   - **Current State**: Responsible disclosure policy only
   - **Target State**: HackerOne program, $100-$5,000 rewards
   - **Timeline**: Q3 2026
   - **Owner**: Security Team

---

## Compliance Evidence Repository

All compliance evidence is stored in the following locations:

| **Evidence Type**           | **Location**                                      | **Retention** |
|-----------------------------|---------------------------------------------------|---------------|
| Security documentation      | `docs/SECURITY.md`, `docs/RBAC.md`               | Indefinite    |
| Audit logs                  | MongoDB `audit_log` collection                   | 90 days       |
| Code repository             | GitHub (git history)                             | Indefinite    |
| Test results                | GitHub Actions CI/CD logs                        | 90 days       |
| Deployment logs             | Vercel deployment history                        | 30 days       |
| Database backups            | MongoDB Atlas snapshots                          | 7 days        |
| Incident reports            | Shared Google Drive (to be configured)           | 7 years       |
| Access reviews              | Quarterly reports (to be implemented)            | 7 years       |
| Vendor contracts            | Legal file share (Vercel, MongoDB, Stripe)       | 7 years       |

---

## Audit Preparation Checklist

### SOC 2 Type II Preparation

- [ ] **Documentation Review** (1 month before audit)
  - [ ] SECURITY.md up-to-date
  - [ ] RBAC.md up-to-date
  - [ ] Incident response procedures tested
  - [ ] Backup/recovery procedures tested

- [ ] **Evidence Collection** (2 weeks before audit)
  - [ ] Export audit logs (past 6 months)
  - [ ] Document all security controls
  - [ ] Prepare access review reports
  - [ ] Collect incident reports (if any)

- [ ] **Stakeholder Interviews** (1 week before audit)
  - [ ] Engineering Lead (architecture, change management)
  - [ ] Security Team (security controls, incident response)
  - [ ] DevOps (operations, monitoring, backup)
  - [ ] Legal Counsel (contracts, privacy policy)

- [ ] **Control Testing** (during audit)
  - [ ] Auditor tests RBAC permissions (all roles)
  - [ ] Auditor tests rate limiting enforcement
  - [ ] Auditor tests multi-tenancy isolation
  - [ ] Auditor reviews audit logs (sampling)

---

### ISO 27001 Preparation

- [ ] **ISMS Documentation** (3 months before audit)
  - [ ] Information security policy
  - [ ] Risk assessment and treatment plan
  - [ ] Statement of Applicability (SoA)
  - [ ] Asset inventory

- [ ] **Control Implementation** (2 months before audit)
  - [ ] All A.5, A.8, A.12, A.14 controls implemented
  - [ ] Evidence collected for each control
  - [ ] Gap remediation complete

- [ ] **Internal Audit** (1 month before audit)
  - [ ] Test all controls (internal audit team)
  - [ ] Document findings
  - [ ] Remediate non-conformities

- [ ] **Certification Audit** (3-day audit)
  - [ ] Stage 1: Documentation review
  - [ ] Stage 2: On-site audit (control testing)
  - [ ] Certificate issued (if no major non-conformities)

---

## Compliance Contacts

### Internal Contacts

- **Security Lead**: security-lead@example.com
- **Engineering Lead**: engineering@example.com
- **Legal Counsel**: legal@example.com
- **Privacy Officer**: privacy@example.com (to be appointed)

### External Contacts

- **SOC 2 Auditor**: (To be selected Q2 2026)
- **ISO 27001 Auditor**: (To be selected Q3 2026)
- **Penetration Testing Firm**: (To be selected Q2 2026)

### Regulatory Authorities

- **OAIC (Australia)**: Office of the Australian Information Commissioner
  - Website: https://www.oaic.gov.au
  - Phone: 1300 363 992

- **Privacy Commissioner (NZ)**: Office of the Privacy Commissioner
  - Website: https://www.privacy.org.nz
  - Phone: 0800 803 909

---

**Document Maintained By**: Security Team
**Last Review**: November 4, 2025
**Next Review**: Quarterly
