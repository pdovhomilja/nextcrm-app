# Environment Variables Setup Guide

This guide provides step-by-step instructions for setting up all environment variables required to run NextCRM App.

## Quick Start

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in the required variables following the instructions below

3. Run the application:
   ```bash
   npm run dev
   ```

---

## 1. Database Configuration

### MongoDB Atlas Setup

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up or log in to your account
3. Create a new cluster (choose free tier for development)
4. Once created, click "Connect"
5. Select "Connect to your application"
6. Copy the connection string
7. Replace `<username>:<password>` with your database user credentials
8. Set the database name (default: `nextcrm-app`)

**Example:**
```
DATABASE_URL="mongodb+srv://admin:password123@cluster0.jzcxjog.mongodb.net/nextcrm-app"
```

**After setting up:**
```bash
npx prisma migrate dev
npx prisma db push
```

---

## 2. Authentication (NextAuth)

### Generate Secret Keys

Generate secure secrets for `NEXTAUTH_SECRET` and `JWT_SECRET`:

**Using Node.js:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Run this command twice to generate both secrets.

**Or using OpenSSL:**
```bash
openssl rand -base64 32
```

### NEXTAUTH_URL

Set to your application's public URL:

- **Development:** `http://localhost:3000`
- **Production:** `https://yourdomain.com`

---

## 3. Google OAuth Setup

### Prerequisites
- Google Cloud Account

### Steps

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (name: "NextCRM")
3. Navigate to "APIs & Services" > "Credentials"
4. Click "Create Credentials" > "OAuth 2.0 Client ID"
5. Choose "Web application"
6. Add authorized redirect URIs:
   - Development: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://yourdomain.com/api/auth/callback/google`
7. Copy the Client ID and Client Secret

**In .env.local:**
```
GOOGLE_ID="xxxx-xxxx.apps.googleusercontent.com"
GOOGLE_SECRET="your-google-secret"
```

---

## 4. GitHub OAuth Setup

### Prerequisites
- GitHub Account

### Steps

1. Go to GitHub Settings > Developer Settings > [OAuth Apps](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in application details:
   - **Application name:** NextCRM
   - **Homepage URL:** `http://localhost:3000` (dev) or `https://yourdomain.com` (prod)
   - **Authorization callback URL:** `http://localhost:3000/api/auth/callback/github`
4. Click "Register application"
5. Copy the Client ID
6. Click "Generate a new client secret"
7. Copy the Client Secret

**In .env.local:**
```
GITHUB_ID="your-github-app-id"
GITHUB_SECRET="your-github-secret"
```

---

## 5. Stripe Setup

### Prerequisites
- Stripe Account

### API Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Click "Developers" in the sidebar
3. Click "API keys"
4. Copy the "Secret key" (starts with `sk_`)
5. Copy the "Publishable key" (starts with `pk_`)

**In .env.local:**
```
STRIPE_SECRET_KEY="sk_test_xxxx"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_xxxx"
```

### Webhook Setup

1. In Stripe Dashboard, go to "Developers" > "Webhooks"
2. Click "Add an endpoint"
3. For development, use [ngrok](https://ngrok.com/):
   ```bash
   ngrok http 3000
   ```
4. Set webhook URL to: `https://your-ngrok-url.ngrok.io/api/webhooks/stripe`
5. Select events: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`
6. Copy the "Signing secret" (starts with `whsec_`)

**In .env.local:**
```
STRIPE_WEBHOOK_SECRET="whsec_test_xxxx"
```

### Price IDs

1. In Stripe Dashboard, go to "Products"
2. Create or select your pricing plans (PRO, ENTERPRISE)
3. For each plan, copy the Price ID (starts with `price_`)

**In .env.local:**
```
STRIPE_PRO_PRICE_ID="price_xxxx"
STRIPE_ENTERPRISE_PRICE_ID="price_xxxx"
```

---

## 6. Email Configuration

### Option A: Gmail with SMTP

1. Enable 2-Factor Authentication on your Gmail account
2. Create an [App Password](https://support.google.com/accounts/answer/185833):
   - Go to Gmail Account > Security
   - Create App Password for "Mail" and "Windows Computer"
   - Copy the 16-character password

**In .env.local:**
```
EMAIL_HOST="smtp.gmail.com"
EMAIL_FROM="your-email@gmail.com"
EMAIL_USERNAME="your-email@gmail.com"
EMAIL_PASSWORD="xxxx xxxx xxxx xxxx"  # 16-character app password
```

### Option B: SendGrid SMTP

1. Sign up for [SendGrid](https://sendgrid.com/)
2. Create an API key (Settings > API Keys)
3. Use `apikey` as username

**In .env.local:**
```
EMAIL_HOST="smtp.sendgrid.net"
EMAIL_FROM="noreply@yourdomain.com"
EMAIL_USERNAME="apikey"
EMAIL_PASSWORD="SG.xxxxx"
```

### Option C: Resend Email Service

1. Sign up for [Resend](https://resend.com/)
2. Create an API key
3. Copy the API key

**In .env.local:**
```
RESEND_API_KEY="re_xxxxx"
```

### IMAP Configuration (for Email Reading)

For invoice processing via email, configure IMAP:

```
IMAP_HOST="imap.gmail.com"
IMAP_PORT="993"
IMAP_USER="your-email@gmail.com"
IMAP_PASSWORD="xxxx xxxx xxxx xxxx"  # Same as EMAIL_PASSWORD
```

---

## 7. OpenAI Configuration (Optional)

### Setup

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in
3. Go to "API keys"
4. Click "Create new secret key"
5. Copy the API key

**In .env.local:**
```
OPENAI_API_KEY="sk-xxxx"
```

---

## 8. DigitalOcean Spaces Configuration

### Prerequisites
- DigitalOcean Account

### Steps

1. Go to [DigitalOcean](https://cloud.digitalocean.com/)
2. Create a new Space (e.g., "nextcrm-files")
3. In "Settings", note the region and endpoint
4. Go to "Account" > "API" > "Spaces Keys"
5. Generate access and secret keys

**In .env.local:**
```
DO_ENDPOINT="https://nyc3.digitaloceanspaces.com"
DO_REGION="nyc3"
DO_ACCESS_KEY_ID="xxxxx"
DO_ACCESS_KEY_SECRET="xxxxx"
```

---

## 9. Rossum OCR Configuration (Optional)

### Setup

1. Sign up for [Rossum](https://rossum.ai/)
2. Get your API credentials
3. Note your API URL

**In .env.local:**
```
ROSSUM_API_URL="https://api.elis.rossum.ai"
ROSSUM_USER="your-username"
ROSSUM_PASS="your-password"
```

---

## 10. Application Configuration

### NEXT_PUBLIC Variables

These are exposed to the browser, so never put sensitive keys here:

```
NEXT_PUBLIC_APP_URL="http://localhost:3000"          # Development
NEXT_PUBLIC_APP_URL="https://yourdomain.com"         # Production
NEXT_PUBLIC_APP_NAME="NextCRM"
```

### Cron Secret

Generate a secret for cron job protection:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**In .env.local:**
```
CRON_SECRET="xxxxx"
```

---

## 11. Redis Configuration (Optional - Production Only)

For production deployments with multiple servers or load balancers:

```
REDIS_URL="redis://localhost:6379"                  # Local
REDIS_URL="redis://user:pass@host:6379"             # With auth
REDIS_URL="rediss://host:6379"                      # SSL/TLS
REDIS_PASSWORD="your-password"                       # If needed
```

---

## Common Issues & Solutions

### Issue: "Missing STRIPE_SECRET_KEY"
**Solution:** Ensure `STRIPE_SECRET_KEY` is set in `.env.local` and the format is correct (starts with `sk_`)

### Issue: "SMTP Authentication failed"
**Solution:**
- For Gmail: Ensure you're using an App Password, not your regular password
- Check that port 465 is not blocked by your firewall
- Verify username and password have no extra spaces

### Issue: "OAuth callback URL mismatch"
**Solution:**
- Ensure `NEXTAUTH_URL` matches your domain
- Register exact callback URLs in OAuth provider settings
- For development with `localhost`, use `http://` not `https://`

### Issue: "Stripe webhook not receiving events"
**Solution:**
- Use ngrok to create a tunnel: `ngrok http 3000`
- Update webhook URL in Stripe Dashboard
- Ensure `STRIPE_WEBHOOK_SECRET` is set correctly
- Check server logs for webhook errors

### Issue: "Database connection timeout"
**Solution:**
- Check MongoDB Atlas IP whitelist: allow your IP
- Verify connection string format
- Ensure network connectivity to database server

### Issue: "Google/GitHub OAuth not working"
**Solution:**
- Clear browser cookies and session storage
- Verify redirect URIs match exactly in provider settings
- Check that IDs and secrets are copied correctly
- Ensure `NEXTAUTH_URL` is set to your public URL

---

## Environment Variable Checklist

### Required for Development
- [ ] DATABASE_URL
- [ ] NEXTAUTH_URL
- [ ] NEXTAUTH_SECRET
- [ ] JWT_SECRET
- [ ] GOOGLE_ID
- [ ] GOOGLE_SECRET
- [ ] GITHUB_ID
- [ ] GITHUB_SECRET
- [ ] STRIPE_SECRET_KEY
- [ ] NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
- [ ] STRIPE_WEBHOOK_SECRET
- [ ] STRIPE_PRO_PRICE_ID
- [ ] STRIPE_ENTERPRISE_PRICE_ID
- [ ] EMAIL_HOST
- [ ] EMAIL_FROM
- [ ] EMAIL_USERNAME
- [ ] EMAIL_PASSWORD
- [ ] IMAP_HOST
- [ ] IMAP_PORT
- [ ] IMAP_USER
- [ ] IMAP_PASSWORD
- [ ] DO_ENDPOINT
- [ ] DO_REGION
- [ ] DO_ACCESS_KEY_ID
- [ ] DO_ACCESS_KEY_SECRET
- [ ] NEXT_PUBLIC_APP_URL
- [ ] NEXT_PUBLIC_APP_NAME
- [ ] CRON_SECRET

### Optional
- [ ] RESEND_API_KEY
- [ ] OPENAI_API_KEY
- [ ] ROSSUM_API_URL
- [ ] ROSSUM_USER
- [ ] ROSSUM_PASS
- [ ] REDIS_URL (production only)
- [ ] REDIS_PASSWORD (production only)

---

## Production Deployment

### Environment Variables for Production

1. **Use `.env.production.local` instead of `.env.local`**
2. **Set `NEXTAUTH_URL` to your production domain**
3. **Use production API keys (sk_live_* and pk_live_*)**
4. **Set strong, randomly generated secrets**
5. **Store sensitive values in your hosting platform's secrets manager:**
   - Vercel: Project Settings > Environment Variables
   - AWS: Secrets Manager or Parameter Store
   - Heroku: Config Vars
   - DigitalOcean: App Platform > Environment Variables

### Secure Secret Management

```bash
# Generate secure secrets for production
node -e "console.log('NEXTAUTH_SECRET:', require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('JWT_SECRET:', require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('CRON_SECRET:', require('crypto').randomBytes(32).toString('hex'))"
```

---

## Validation

### Test Your Configuration

```bash
# After setting up .env.local, run:
npm run dev

# Check for error messages about missing environment variables
# Try logging in with Google/GitHub
# Test email sending functionality
# Verify Stripe webhook receiving
```

---

## Support

For issues, refer to:
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Stripe Documentation](https://stripe.com/docs)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [OpenAI Documentation](https://platform.openai.com/docs/)

---

Last updated: 2025-11-03
