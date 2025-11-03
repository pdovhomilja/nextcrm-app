# Environment Variables Quick Reference

## Copy & Paste Template

```bash
# Database
DATABASE_URL="mongodb+srv://username:password@cluster.mongodb.net/nextcrm-app"
REDIS_URL="redis://localhost:6379"
REDIS_PASSWORD=""

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="[GENERATE: openssl rand -base64 32]"
JWT_SECRET="[GENERATE: openssl rand -base64 32]"

# Google OAuth
GOOGLE_ID="xxxx.apps.googleusercontent.com"
GOOGLE_SECRET="xxxx"

# GitHub OAuth
GITHUB_ID="xxxx"
GITHUB_SECRET="xxxx"

# Stripe
STRIPE_SECRET_KEY="sk_test_xxxx"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_xxxx"
STRIPE_WEBHOOK_SECRET="whsec_test_xxxx"
STRIPE_PRO_PRICE_ID="price_xxxx"
STRIPE_ENTERPRISE_PRICE_ID="price_xxxx"

# Email - SMTP
EMAIL_HOST="smtp.gmail.com"
EMAIL_FROM="noreply@yourdomain.com"
EMAIL_USERNAME="your-email@gmail.com"
EMAIL_PASSWORD="xxxx xxxx xxxx xxxx"

# Email - IMAP
IMAP_HOST="imap.gmail.com"
IMAP_PORT="993"
IMAP_USER="your-email@gmail.com"
IMAP_PASSWORD="xxxx xxxx xxxx xxxx"

# Email - Resend (Optional)
RESEND_API_KEY="re_xxxx"

# OpenAI (Optional)
OPENAI_API_KEY="sk-xxxx"

# DigitalOcean Spaces
DO_ENDPOINT="https://nyc3.digitaloceanspaces.com"
DO_REGION="nyc3"
DO_ACCESS_KEY_ID="xxxx"
DO_ACCESS_KEY_SECRET="xxxx"

# Rossum OCR (Optional)
ROSSUM_API_URL="https://api.elis.rossum.ai"
ROSSUM_USER="xxxx"
ROSSUM_PASS="xxxx"

# Application
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_NAME="NextCRM"
NEXT_PUBLIC_DISCORD_INVITE_URL="https://discord.gg/xxxx"
NEXT_PUBLIC_GITHUB_ISSUES_URL="https://github.com/xxxx/nextcrm-app/issues"

# Cron
CRON_SECRET="[GENERATE: openssl rand -base64 32]"
```

---

## Environment Variables Checklist

### Database (1/1)
- [x] DATABASE_URL

### Redis (2/2) - Optional
- [x] REDIS_URL
- [x] REDIS_PASSWORD

### Authentication (5/5)
- [x] NEXTAUTH_URL
- [x] NEXTAUTH_SECRET
- [x] JWT_SECRET
- [x] GOOGLE_ID
- [x] GOOGLE_SECRET

### GitHub OAuth (2/2)
- [x] GITHUB_ID
- [x] GITHUB_SECRET

### Stripe (5/5)
- [x] STRIPE_SECRET_KEY
- [x] NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
- [x] STRIPE_WEBHOOK_SECRET
- [x] STRIPE_PRO_PRICE_ID
- [x] STRIPE_ENTERPRISE_PRICE_ID

### Email SMTP (4/4)
- [x] EMAIL_HOST
- [x] EMAIL_FROM
- [x] EMAIL_USERNAME
- [x] EMAIL_PASSWORD

### Email IMAP (4/4)
- [x] IMAP_HOST
- [x] IMAP_PORT
- [x] IMAP_USER
- [x] IMAP_PASSWORD

### Email Services - Optional (1/1)
- [x] RESEND_API_KEY

### AI/ML - Optional (1/1)
- [x] OPENAI_API_KEY

### File Storage (4/4)
- [x] DO_ENDPOINT
- [x] DO_REGION
- [x] DO_ACCESS_KEY_ID
- [x] DO_ACCESS_KEY_SECRET

### Invoice OCR - Optional (3/3)
- [x] ROSSUM_API_URL
- [x] ROSSUM_USER
- [x] ROSSUM_PASS

### Application (4/4)
- [x] NEXT_PUBLIC_APP_URL
- [x] NEXT_PUBLIC_APP_NAME
- [x] NEXT_PUBLIC_DISCORD_INVITE_URL
- [x] NEXT_PUBLIC_GITHUB_ISSUES_URL

### Security (1/1)
- [x] CRON_SECRET

---

## Service Setup Priority

### Phase 1: Core (Start Here)
1. MongoDB - `DATABASE_URL`
2. NextAuth Secrets - `NEXTAUTH_SECRET`, `JWT_SECRET`
3. Application URLs - `NEXTAUTH_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_APP_NAME`

### Phase 2: Authentication
4. Google OAuth - `GOOGLE_ID`, `GOOGLE_SECRET`
5. GitHub OAuth - `GITHUB_ID`, `GITHUB_SECRET`

### Phase 3: Payments
6. Stripe Keys - `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
7. Stripe Webhooks - `STRIPE_WEBHOOK_SECRET`
8. Stripe Plans - `STRIPE_PRO_PRICE_ID`, `STRIPE_ENTERPRISE_PRICE_ID`

### Phase 4: Email
9. SMTP - `EMAIL_HOST`, `EMAIL_FROM`, `EMAIL_USERNAME`, `EMAIL_PASSWORD`
10. IMAP - `IMAP_HOST`, `IMAP_PORT`, `IMAP_USER`, `IMAP_PASSWORD`

### Phase 5: Storage & AI
11. DigitalOcean - `DO_ENDPOINT`, `DO_REGION`, `DO_ACCESS_KEY_ID`, `DO_ACCESS_KEY_SECRET`
12. OpenAI (Optional) - `OPENAI_API_KEY`

### Phase 6: Advanced (Optional)
13. Resend - `RESEND_API_KEY`
14. Rossum - `ROSSUM_API_URL`, `ROSSUM_USER`, `ROSSUM_PASS`
15. Redis - `REDIS_URL`, `REDIS_PASSWORD`
16. Community Links - `NEXT_PUBLIC_DISCORD_INVITE_URL`, `NEXT_PUBLIC_GITHUB_ISSUES_URL`

### Phase 7: Security
17. Cron Secret - `CRON_SECRET`

---

## Quick Links

### Setup Guides
- [Full Setup Guide](./ENV_SETUP_GUIDE.md)
- [Complete Documentation](./ENV_DOCUMENTATION_SUMMARY.md)

### External Services
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- [Google Cloud Console](https://console.cloud.google.com/)
- [GitHub OAuth Settings](https://github.com/settings/developers)
- [Stripe Dashboard](https://dashboard.stripe.com/)
- [Gmail App Passwords](https://support.google.com/accounts/answer/185833)
- [OpenAI Platform](https://platform.openai.com/)
- [DigitalOcean Console](https://cloud.digitalocean.com/)
- [Resend Dashboard](https://resend.com/)
- [Rossum Platform](https://rossum.ai/)

### Key Commands
```bash
# Generate secure random secrets
openssl rand -base64 32

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Copy template to local
cp .env.example .env.local

# Start development server
npm run dev

# Run database migrations
npx prisma migrate dev
```

---

## Common Mistakes to Avoid

1. **Don't use regular Gmail password** - Use App Password instead
2. **Don't commit .env.local** - It's in .gitignore for a reason
3. **Don't mix test_* and live_* keys** - Use test keys for development
4. **Don't leave NEXT_PUBLIC_ variables with secrets** - They're visible in browser
5. **Don't forget STRIPE_WEBHOOK_SECRET** - Webhooks won't be verified
6. **Don't use localhost in NEXTAUTH_URL for production** - Use your domain
7. **Don't hardcode secrets in code** - Always use environment variables

---

## Testing Configuration

```bash
# 1. Setup .env.local with all Phase 1 & 2 variables
# 2. Start server: npm run dev
# 3. Test each service:

# Test authentication
curl http://localhost:3000/api/auth/providers

# Test database
npx prisma db push

# Test email (after Phase 4)
# Send test email through app

# Test Stripe (after Phase 3)
# Create test payment in app

# Test storage (after Phase 5)
# Upload a file in app
```

---

## Production Deployment Checklist

- [ ] Create `.env.production.local`
- [ ] Update `NEXTAUTH_URL` to production domain
- [ ] Use `sk_live_*` and `pk_live_*` Stripe keys
- [ ] Set up production database
- [ ] Configure webhook endpoints with production URL
- [ ] Test all services with production keys
- [ ] Store secrets in hosting platform
- [ ] Enable Redis for production (if scaling)
- [ ] Set up monitoring and logging
- [ ] Test failover and recovery procedures

---

**For detailed setup instructions, see [ENV_SETUP_GUIDE.md](./ENV_SETUP_GUIDE.md)**

Last Updated: 2025-11-03
