# NextCRM → AWMS Documentation Index

**Welcome to the NextCRM platform documentation!** This repository contains comprehensive technical documentation for the NextCRM → AWMS (Automotive Workshop Management System) transformation.

---

## 📚 Documentation Overview

### **Tier 1: Executive & Business**
High-level overview for stakeholders, product managers, and business decision-makers.

- **[AWMS Product Vision](../README.md)** - Project overview, roadmap, and business context
- **[SaaS Transformation Summary](../SAAS_TRANSFORMATION_COMPLETE.md)** - Multi-tenancy, billing, and enterprise features

---

### **Tier 2: Development & Integration**
Practical guides for developers implementing features and integrations.

- **[Quick Start Guide](./QUICK_START.md)** - Get up and running in 15 minutes *(coming soon)*
- **[API Documentation](./API_REFERENCE.md)** - REST API reference *(coming soon)*
- **[Developer Onboarding](./DEVELOPER_ONBOARDING.md)** - New developer checklist *(coming soon)*

---

### **Tier 3: Architecture & Security** ⭐ **You Are Here**
Deep technical documentation for architects, security auditors, and senior engineers.

| **Document**                    | **Purpose**                                      | **Audience**                     | **Status** |
|---------------------------------|--------------------------------------------------|----------------------------------|------------|
| **[ARCHITECTURE.md](./ARCHITECTURE.md)** | Complete system architecture and design patterns | Architects, Senior Engineers     | ✅ Complete |
| **[SECURITY.md](./SECURITY.md)**         | Security controls, threat model, and compliance  | Security Team, Auditors          | ✅ Complete |
| **[RBAC.md](./RBAC.md)**                 | Role-based access control implementation         | Engineers, Security Team         | ✅ Complete |
| **[MAINTENANCE.md](./MAINTENANCE.md)**   | Operational guide and troubleshooting            | DevOps, On-Call Engineers        | ✅ Complete |

---

## 🎯 Quick Navigation

### I want to...

**Understand the system architecture**
→ Start with [ARCHITECTURE.md](./ARCHITECTURE.md)
→ See: System Overview, Data Flow Diagrams, Component Architecture

**Prepare for a security audit (SOC 2, ISO 27001)**
→ Read [SECURITY.md](./SECURITY.md)
→ See: Compliance Mappings, Security Controls, Threat Model

**Implement permission checking in a new API endpoint**
→ Refer to [RBAC.md](./RBAC.md)
→ See: Implementation Patterns, Permission Matrix

**Debug a production issue**
→ Check [MAINTENANCE.md](./MAINTENANCE.md)
→ See: Common Debugging Scenarios, Log Locations

**Onboard a new developer**
→ Follow [Developer Onboarding](./DEVELOPER_ONBOARDING.md) *(coming soon)*

**Integrate with a third-party API**
→ Review [API Documentation](./API_REFERENCE.md) *(coming soon)*

---

## 🚀 Getting Started

### For New Developers

1. **Read**: [Project Overview](../README.md) - Understand the business context
2. **Read**: [ARCHITECTURE.md](./ARCHITECTURE.md) - Understand the technical architecture
3. **Setup**: Follow [Quick Start Guide](./QUICK_START.md) *(coming soon)*
4. **Code**: Make your first contribution following [RBAC.md](./RBAC.md) patterns

### For Security Auditors

1. **Read**: [SECURITY.md](./SECURITY.md) - Complete security controls documentation
2. **Review**: [Compliance Mappings](./SECURITY.md#compliance-mappings) - SOC 2, GDPR, ISO 27001
3. **Verify**: [RBAC Testing](./RBAC.md#testing-guide) - 68 unit tests covering all permissions
4. **Inspect**: [Audit Logs](./MAINTENANCE.md#log-locations-and-formats) - 90-day retention

### For Operations Teams

1. **Read**: [MAINTENANCE.md](./MAINTENANCE.md) - Operational procedures
2. **Bookmark**: [Common Debugging Scenarios](./MAINTENANCE.md#common-debugging-scenarios)
3. **Setup**: Monitoring and alerting (PagerDuty integration recommended)
4. **Test**: Incident response procedures (quarterly tabletop exercises)

---

## 📖 Document Details

### ARCHITECTURE.md (21,000 words)

**Comprehensive system architecture documentation for NextCRM → AWMS**

**Contents**:
- Executive Summary (technology stack, deployment architecture)
- System Overview (high-level component diagram)
- Core Components (frontend, backend, database, auth, rate limiting)
- AWMS Feature Mapping (CRM → Automotive translation)
- Data Flow Diagrams (authentication, API lifecycle, multi-tenancy)
- Security Layers (defense-in-depth strategy)
- Multi-Tenancy Design (organization-based isolation)
- Performance Characteristics (latency targets, scalability)
- Deployment Architecture (Vercel + MongoDB Atlas + Stripe)
- Monitoring & Observability (metrics, alerting, logging)
- Disaster Recovery (RTO/RPO targets, backup strategy)
- Future Enhancements (roadmap Q1-Q4 2026)

**Key Sections for Quick Reference**:
- [AWMS Feature Mapping](./ARCHITECTURE.md#awms-feature-mapping) - CRM → Automotive translation
- [Permission Matrix](./ARCHITECTURE.md#rbac-role-hierarchy) - Who can do what
- [Rate Limiting Strategy](./ARCHITECTURE.md#rate-limiting-architecture) - Plan-based DDoS protection
- [Multi-Tenant Isolation](./ARCHITECTURE.md#multi-tenant-data-isolation) - Security by design

---

### SECURITY.md (17,000 words)

**Complete security documentation for compliance audits and threat modeling**

**Contents**:
- Security Overview (defense-in-depth philosophy)
- Threat Model (assets, threat actors, attack vectors)
- Security Controls Implemented (authentication, authorization, rate limiting, data protection, audit logging, input validation, API security)
- OWASP Top 10 Mitigation (complete coverage with evidence)
- Compliance Mappings (SOC 2, GDPR, ISO 27001:2022)
- Security Testing (unit tests, integration tests, manual testing)
- Incident Response (detection, procedures, escalation)
- Security Roadmap (MFA, breach detection, SOC 2 audit, ISO certification)

**Key Sections for Auditors**:
- [SOC 2 Mappings](./SECURITY.md#soc-2-type-ii-trust-service-criteria) - CC6.1, CC6.7, CC7.2, CC8.1
- [GDPR Compliance](./SECURITY.md#gdpr-compliance) - Articles 15, 17, 20, 32, 33
- [ISO 27001 Controls](./SECURITY.md#iso-270012022-controls) - A.5.15, A.5.17, A.8.2, A.12.4.1
- [Incident Response](./SECURITY.md#incident-response) - P0/P1/P2 procedures

---

### RBAC.md (9,000 words)

**Practical guide for implementing role-based access control**

**Contents**:
- Overview (4-tier role system, design principles)
- Role Definitions (VIEWER, MEMBER, ADMIN, OWNER with AWMS use cases)
- Permission Matrix (complete grid: roles × operations × endpoints)
- Implementation Patterns (middleware, Server Actions, UI guards)
- Testing Guide (68 unit tests, integration tests, manual testing)
- Common Scenarios (promote to admin, ownership checks, customer portal)
- Troubleshooting (permission denied, audit logging, rate limiting)

**Key Sections for Developers**:
- [Implementation Patterns](./RBAC.md#implementation-patterns) - Code examples for API routes
- [Permission Matrix](./RBAC.md#permission-matrix) - Complete role × operation grid
- [Common Scenarios](./RBAC.md#common-scenarios) - Real-world permission checks
- [Troubleshooting](./RBAC.md#troubleshooting) - Debug permission issues

---

### MAINTENANCE.md (8,000 words)

**Operational guide for DevOps and on-call engineers**

**Contents**:
- Common Debugging Scenarios (login failures, 403 errors, rate limits, slow queries)
- Log Locations and Formats (Vercel logs, audit logs, query patterns)
- Database Maintenance (indexes, backups, cleanup procedures)
- Performance Monitoring (key metrics, monitoring tools, alerting)
- Rate Limit Management (view limits, reset limits, adjust limits)
- Security Incident Procedures (P0/P1/P2 checklists, security queries)
- Backup and Recovery (full backup, restore procedures, RTO/RPO)
- Deployment Procedures (standard deployment, hotfix, rollback)

**Key Sections for Operations**:
- [Debugging Scenarios](./MAINTENANCE.md#common-debugging-scenarios) - Step-by-step diagnostics
- [Log Queries](./MAINTENANCE.md#log-locations-and-formats) - MongoDB audit log queries
- [Incident Response](./MAINTENANCE.md#security-incident-procedures) - P0/P1/P2 checklists
- [Rollback Procedures](./MAINTENANCE.md#rollback-procedures) - Emergency recovery

---

## 🔐 Security & Compliance

### Compliance Status

| **Framework**      | **Status**       | **Target Date** | **Documentation**                  |
|--------------------|------------------|-----------------|-------------------------------------|
| SOC 2 Type II      | In Progress      | Q2 2026         | [SECURITY.md](./SECURITY.md#soc-2-type-ii-trust-service-criteria) |
| ISO 27001:2022     | Planned          | Q3 2026         | [SECURITY.md](./SECURITY.md#iso-270012022-controls) |
| GDPR               | ✅ Compliant     | Current         | [SECURITY.md](./SECURITY.md#gdpr-compliance) |
| Privacy Act 1988 (AU) | ✅ Compliant  | Current         | [SECURITY.md](./SECURITY.md#gdpr-compliance) |
| Privacy Act 2020 (NZ) | ✅ Compliant  | Current         | [SECURITY.md](./SECURITY.md#gdpr-compliance) |
| PCI DSS            | N/A (Stripe)     | -               | Stripe is PCI Level 1 compliant     |

### Security Testing Coverage

- **Unit Tests**: 68 RBAC permission tests
- **Integration Tests**: Multi-tenancy isolation, API security
- **Manual Testing**: Quarterly security review checklist
- **Penetration Testing**: Annual (scheduled Q2 2026)
- **Bug Bounty**: Planned Q3 2026 (HackerOne)

---

## 🛠️ Technology Stack

**Frontend**:
- Next.js 15 (App Router, Server Components)
- React 18
- TypeScript 5
- shadcn/ui (Radix UI + Tailwind CSS)
- Zustand (state management)

**Backend**:
- Next.js API Routes (RESTful APIs)
- Server Actions (type-safe mutations)
- NextAuth.js (authentication)
- Prisma ORM (database queries)

**Database**:
- MongoDB Atlas (primary database)
- Prisma (ORM layer)
- Indexes: organizationId (multi-tenancy), createdAt (time-series)

**Infrastructure**:
- Vercel (serverless deployment, edge network)
- MongoDB Atlas (database hosting, backups)
- DigitalOcean Spaces (file storage, S3-compatible)
- Stripe (billing, subscriptions, payments)
- Resend (transactional email)

**Security**:
- NextAuth.js (OAuth + credentials)
- bcrypt (password hashing, 10 rounds)
- JWT (session tokens, HS256)
- Rate Limiting (in-memory, plan-based)
- RBAC (4-tier role system)
- Audit Logging (comprehensive trail)

---

## 📊 System Metrics

### Performance Targets

- **API Response Time**: < 200ms (95th percentile)
- **Database Query**: < 50ms (95th percentile)
- **Page Load Time**: < 2 seconds (First Contentful Paint)
- **Rate Limit Overhead**: < 2ms per request
- **Session Lookup**: ~10ms (JWT decode + database query)

### Availability Targets

- **Uptime SLA**: 99.9% (Vercel + MongoDB Atlas)
- **RTO (Recovery Time)**: 4 hours
- **RPO (Recovery Point)**: 6 hours (last database snapshot)

### Scale Limits

- **Organizations**: 10,000+ (horizontal scaling ready)
- **Users per Org**: Unlimited (plan-dependent)
- **API Requests**: Plan-based (100/hr → 10k/hr)
- **File Storage**: Plan-based (1 GB → Unlimited)

---

## 🗺️ Roadmap

### Q1 2026 (Short-Term)

- [ ] Multi-factor authentication (TOTP)
- [ ] Password breach detection (HaveIBeenPwned)
- [ ] IP allowlisting (ENTERPRISE plan)
- [ ] Session anomaly detection
- [ ] Redis rate limiting (multi-server)

### Q2 2026 (Medium-Term)

- [ ] API key management (third-party integrations)
- [ ] Advanced threat detection (ML-based)
- [ ] Security dashboard (real-time metrics)
- [ ] SOC 2 Type II audit (external auditor)
- [ ] Penetration testing (CREST-certified)

### Q3 2026 (Long-Term)

- [ ] ISO 27001:2022 certification
- [ ] Bug bounty program (HackerOne)
- [ ] AWMS Phase 1: Vehicle registry, bay management, parts catalog
- [ ] Mobile app (React Native, technician access)
- [ ] Customer portal (self-service booking, service history)

### Q4 2026 (Future)

- [ ] AWMS Phase 2: OEM integrations, accounting export, payment terminal
- [ ] AWMS Phase 3: Franchise module, IoT integration, marketplace
- [ ] White-label solution (custom branding for workshop chains)

---

## 🤝 Contributing

### Documentation Updates

All documentation should be kept up-to-date with code changes:

1. **Architecture Changes**: Update `ARCHITECTURE.md`
2. **Security Controls**: Update `SECURITY.md`
3. **Permission Changes**: Update `RBAC.md`
4. **Operational Procedures**: Update `MAINTENANCE.md`

### Review Schedule

- **Weekly**: README updates (if needed)
- **Monthly**: Quick review of all docs for accuracy
- **Quarterly**: Comprehensive review with security audit
- **Annually**: Complete rewrite if major changes

---

## 📞 Contact & Support

### Documentation Team

- **Author**: AWMS Architecture Team
- **Maintainer**: Engineering Lead
- **Last Review**: November 4, 2025
- **Next Review**: February 1, 2026

### Questions or Feedback

- **General Questions**: engineering@example.com
- **Security Questions**: security@example.com
- **Documentation Issues**: docs@example.com
- **GitHub Issues**: `github.com/your-org/nextcrm-app/issues`

---

## 📜 License

This documentation is proprietary and confidential. Unauthorized distribution is prohibited.

**Copyright © 2025 AWMS Team. All rights reserved.**

---

**Last Updated**: November 4, 2025 by AWMS Architecture Team
