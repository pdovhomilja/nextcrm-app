# 🤖 Agent Context Guide - NextCRM AWMS

**Purpose**: Quick context loading for AI agents (Claude Code, etc.)
**Last Updated**: November 4, 2025
**Repository**: https://github.com/DrivenIdeaLab/nextcrm

---

## 🎯 Quick Start for Agents

### Essential Context (Read First)
1. **Project Overview**: [README.md](../README.md) - What is NextCRM/AWMS
2. **Current State**: [DEPLOYMENT_STATUS.md](../DEPLOYMENT_STATUS.md) - Latest deployment status
3. **Architecture**: [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) - System design (21K words)
4. **Quality Score**: 81/100 - Staging approved, production in 1-2 weeks

### Critical Facts
- **Tech Stack**: Next.js 15, TypeScript, Prisma, MongoDB, NextAuth
- **Status**: ✅ Staging deployed | ⚠️ Production pending test fixes
- **Test Pass Rate**: 80.67% (96/119 tests)
- **Security**: 100% OWASP Top 10 coverage, RBAC implemented
- **Multi-Tenancy**: organizationId-based isolation throughout

---

## 📚 Documentation Structure (Read Strategically)

### Tier 1: Executive (5 min read)
- `DEPLOYMENT_STATUS.md` - Current deployment state
- `PRODUCTION_READINESS_ASSESSMENT.md` - Quality scorecard
- `docs/README.md` - Documentation index

### Tier 2: Development (30 min read)
- `docs/ARCHITECTURE.md` - Complete system design
- `docs/RBAC.md` - Permission system
- `docs/SECURITY.md` - Security controls

### Tier 3: Deep Dive (2+ hours)
- `docs/MAINTENANCE.md` - Operations guide
- `docs/QA_COMPREHENSIVE_REPORT.md` - Detailed verification
- All files in `docs/` folder

### Task-Specific Docs
- **Adding Features**: Start with `docs/ARCHITECTURE.md` → AWMS Feature Mapping
- **Security Work**: Read `docs/SECURITY.md` → OWASP Top 10 section
- **Debugging**: Check `docs/MAINTENANCE.md` → Common Scenarios
- **Testing**: See `tests/README.md` → Test structure

---

## 🏗️ Codebase Navigation

### Critical Directories (Token-Efficient Reading)

**Instead of reading entire directories, use these entry points:**

```
app/
├── [locale]/(routes)/           # Main application pages
│   ├── crm/                     # CRM module (accounts, contacts, leads)
│   ├── projects/                # Project management
│   └── settings/                # Organization settings
│
├── api/                         # API routes (88 endpoints)
│   ├── crm/                     # CRM CRUD operations
│   ├── organization/            # Multi-tenancy & RBAC
│   ├── billing/                 # Stripe integration
│   └── webhooks/                # Stripe webhooks
│
actions/                         # Server Actions (organized by feature)
├── crm/                         # CRM actions
├── projects/                    # Project actions
└── admin/                       # Admin actions

lib/
├── auth.ts                      # NextAuth configuration (READ FIRST for auth)
├── prisma.ts                    # Database client
├── rate-limit.ts                # Rate limiting logic
├── stripe.ts                    # Stripe integration
├── permission-helpers.ts        # RBAC helpers (READ FIRST for permissions)
└── rate-limit-config.ts         # Rate limit configurations

middleware/
├── require-permission.ts        # RBAC middleware
└── with-rate-limit.ts           # Rate limiting middleware

prisma/
└── schema.prisma                # Database schema (READ FIRST for data model)

tests/
├── unit/                        # Unit tests (5 files)
├── integration/                 # Integration tests (2 files)
└── mocks/                       # Test mocks
```

### Key Files by Task

**Authentication Work:**
1. Read: `lib/auth.ts` (NextAuth config)
2. Read: `app/api/auth/[...nextauth]/route.ts`
3. Test: `tests/unit/lib/auth.test.ts`

**RBAC/Permissions Work:**
1. Read: `lib/permission-helpers.ts` (core logic)
2. Read: `middleware/require-permission.ts`
3. Read: `docs/RBAC.md` (complete guide)
4. Test: `tests/unit/lib/permissions.test.ts`

**Rate Limiting Work:**
1. Read: `lib/rate-limit.ts` (core implementation)
2. Read: `lib/rate-limit-config.ts` (plan configurations)
3. Test: `tests/unit/lib/rate-limit.test.ts`

**Multi-Tenancy Work:**
1. Read: `docs/ARCHITECTURE.md` → Multi-Tenant Isolation section
2. Check: All API routes have `organizationId` filtering
3. Test: `tests/integration/api/multi-tenancy.test.ts` (currently failing due to ESM)

**Billing/Stripe Work:**
1. Read: `lib/stripe.ts`
2. Read: `app/api/webhooks/stripe/route.ts`
3. Test: `tests/unit/lib/stripe.test.ts`

---

## 🎯 Common Agent Tasks (Optimized Paths)

### Task 1: "Add a new CRM feature"
**Context needed (5 min):**
1. Read `docs/ARCHITECTURE.md` → AWMS Feature Mapping section
2. Read `prisma/schema.prisma` → Find relevant models
3. Scan `app/[locale]/(routes)/crm/` → Understand existing patterns

**Steps:**
1. Add Prisma model (follow naming: `crm_NewFeature`)
2. Create page: `app/[locale]/(routes)/crm/new-feature/page.tsx`
3. Create API route: `app/api/crm/new-feature/route.ts`
4. Add Server Action: `actions/crm/new-feature/`
5. Add to navigation

### Task 2: "Fix a permission bug"
**Context needed (5 min):**
1. Read `lib/permission-helpers.ts` → Core permission logic
2. Read `docs/RBAC.md` → Permission matrix
3. Check failing test location

**Steps:**
1. Identify missing permission check
2. Add `requirePermission()` or middleware
3. Update tests
4. Run: `pnpm test tests/unit/lib/permissions.test.ts`

### Task 3: "Debug authentication issue"
**Context needed (5 min):**
1. Read `lib/auth.ts` → NextAuth providers
2. Check `docs/MAINTENANCE.md` → Common Debugging Scenarios → Login Failures
3. Review error logs

**Steps:**
1. Check session lookup
2. Verify JWT configuration
3. Test providers individually
4. Check audit logs: `app/api/organization/audit-logs/route.ts`

### Task 4: "Add rate limiting to endpoint"
**Context needed (3 min):**
1. Read `lib/rate-limit-config.ts` → Understand plan limits
2. Check `middleware/with-rate-limit.ts` → How to apply

**Steps:**
1. Import `withRateLimit` middleware
2. Wrap route handler
3. Test: `pnpm test tests/unit/lib/rate-limit.test.ts`

### Task 5: "Review security posture"
**Context needed (15 min):**
1. Read `docs/SECURITY.md` → OWASP Top 10 section
2. Read `PRODUCTION_READINESS_ASSESSMENT.md` → Security Controls
3. Review test results: `docs/QA_EXECUTIVE_SUMMARY.md`

**No code needed**, just verification.

---

## 🚨 Known Issues (Check Before Starting Work)

### Test Infrastructure Issues (P1)
- **ESM Module Support**: Fixed in jest.config.js but multi-tenancy tests still fail
- **Prisma Mocks**: `jest-mock-extended` resets causing auth test failures
- **Headers Polyfill**: Stripe webhook tests need Headers API mock
- **Status**: 80.67% pass rate (96/119), critical tests 100% passing

### Documentation Gaps (P2)
- **AWMS Context**: 65% complete, need automotive terminology throughout
- **Status**: Documented but needs Tier 1 file updates

### Production Blockers (P0)
- ❌ Test pass rate < 95% (currently 80.67%)
- ❌ Multi-tenancy tests not running (ESM issue)
- ⚠️ Manual security verification pending

**See**: `PRODUCTION_READINESS_ASSESSMENT.md` for complete list

---

## 🔧 Development Commands (Quick Reference)

```bash
# Development
pnpm dev                          # Start dev server (port 3000)

# Database
pnpm prisma generate              # Generate Prisma client
pnpm prisma db push               # Push schema to MongoDB
pnpm prisma studio                # Open database GUI

# Testing
pnpm test                         # Run all tests
pnpm test -- tests/unit/lib/permissions.test.ts  # Specific test
pnpm test -- --watch              # Watch mode

# Build
pnpm build                        # Production build
pnpm start                        # Start production server

# Linting
pnpm lint                         # ESLint check
pnpm lint --fix                   # Auto-fix issues
```

---

## 📊 Quality Metrics (Current State)

```
Overall Score: 81/100

✅ Documentation:     95%  (75K+ words, enterprise standards)
✅ Security:         100%  (OWASP Top 10 covered, RBAC enforced)
⚠️ Tests:           80.67% (96/119 passing, critical 100%)
✅ Code Quality:     100%  (0 TypeScript errors)
⚠️ AWMS Context:      65%  (needs automotive terminology)
⚠️ Compliance:        75%  (SOC 2: 85%, GDPR: 65%)
```

**Target for Production**: 90/100

---

## 🎓 Learning Resources (External)

### Next.js 15
- **Docs**: https://nextjs.org/docs
- **App Router**: Use Server Components by default
- **Server Actions**: Type-safe mutations

### Prisma
- **Docs**: https://www.prisma.io/docs
- **MongoDB**: Document-based schema design
- **Relations**: Use `@relation` with `@db.ObjectId`

### NextAuth.js
- **Docs**: https://next-auth.js.org
- **Strategy**: JWT session tokens
- **Providers**: Google, GitHub, Credentials

### RBAC Pattern
- **Reference**: `docs/RBAC.md`
- **Roles**: VIEWER < MEMBER < ADMIN < OWNER
- **Implementation**: `lib/permission-helpers.ts`

---

## 🤝 Agent Collaboration Tips

### When Working with Multiple Agents
1. **Read this file first** - Sets common context
2. **Check DEPLOYMENT_STATUS.md** - Current state
3. **Use task-specific docs** - Don't read everything
4. **Update DEPLOYMENT_STATUS.md** - Document changes
5. **Create GitHub issues** - For unfinished work

### Token Efficiency Strategies
1. **Don't read entire directories** - Use entry points above
2. **Read tests to understand code** - More concise than implementation
3. **Leverage existing docs** - 75K words already written
4. **Use `grep` strategically** - Find specific patterns
5. **Check git history** - Understand recent changes

### Communication Protocol
1. **Status updates** → Update DEPLOYMENT_STATUS.md
2. **Architecture changes** → Update docs/ARCHITECTURE.md
3. **New features** → Add to docs/README.md
4. **Bugs found** → Create GitHub issue
5. **Testing results** → Update docs/QA_EXECUTIVE_SUMMARY.md

---

## 📞 Support & Resources

### Documentation Files (Priority Order)
1. **DEPLOYMENT_STATUS.md** - Start here
2. **docs/README.md** - Documentation index
3. **docs/ARCHITECTURE.md** - System design
4. **docs/SECURITY.md** - Security controls
5. **docs/RBAC.md** - Permission system
6. **docs/MAINTENANCE.md** - Operations guide

### GitHub Resources
- **Issues**: Track bugs and features
- **Projects**: Task management
- **Wiki**: Extended documentation (coming soon)
- **Actions**: CI/CD automation

### External Links
- **Repository**: https://github.com/DrivenIdeaLab/nextcrm
- **Staging**: (to be deployed)
- **Production**: (pending 1-2 weeks)

---

## 🎯 Mission: AWMS Transformation

**Goal**: Transform NextCRM into AWMS (Automotive Workshop Management System)

**Progress**: 65% AWMS context complete

**Next Steps**:
1. Complete automotive terminology in documentation
2. Fix test infrastructure (ESM modules)
3. Manual multi-tenancy verification
4. Deploy to production (1-2 weeks)

**CRM → AWMS Mapping**:
- Organizations → Workshop Chains
- Accounts → Workshop Locations
- Contacts → Customers + Staff
- Leads → Service Inquiries
- Opportunities → Service Orders/Jobs
- Tasks → Repair Steps

See `docs/ARCHITECTURE.md` → AWMS Feature Mapping for complete translation.

---

## ✅ Checklist for New Agents

Before starting work:
- [ ] Read this file (AGENT_CONTEXT.md)
- [ ] Read DEPLOYMENT_STATUS.md
- [ ] Check Known Issues section above
- [ ] Identify task-specific docs needed
- [ ] Review relevant tests
- [ ] Check git status for uncommitted work

---

**Last Context Update**: November 4, 2025 - Post-staging deployment
**Next Update Trigger**: Production deployment or major architecture change
**Maintained By**: AWMS Orchestration Team

🤖 **This file is optimized for AI agent context efficiency. Keep it under 3,000 words.**
