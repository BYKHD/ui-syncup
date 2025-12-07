# Custom Domain Setup Guide

This guide walks you through configuring your custom domain for UI SyncUp after domain registration.

## Prerequisites

Before starting, ensure you have:

- [ ] Registered your custom domain (e.g., `yourdomain.com`)
- [ ] Access to your domain registrar's DNS settings
- [ ] Access to Vercel Dashboard with project permissions
- [ ] Access to Google Cloud Console (for OAuth)
- [ ] Access to Supabase Dashboard (if using Supabase Auth)

**Estimated Time**: 30-60 minutes (plus DNS propagation time)

---

## Step 1: Configure Domain in Vercel

### 1.1 Add Domain to Vercel Project

1. **Login to Vercel Dashboard**
   - Navigate to [vercel.com/dashboard](https://vercel.com/dashboard)
   - Select your UI SyncUp project

2. **Add Custom Domain**
   - Go to **Settings** → **Domains**
   - Click **"Add"** button
   - Enter your domain: `yourdomain.com`
   - Click **"Add"**

3. **Add WWW Subdomain** (Optional but Recommended)
   - Click **"Add"** again
   - Enter: `www.yourdomain.com`
   - Vercel will automatically redirect `www` to your main domain

### 1.2 Configure DNS Records

Vercel will show you DNS configuration instructions. Choose one option:

#### Option A: A Record (Recommended for Root Domain)

Add these records in your domain registrar's DNS settings:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | `76.76.21.21` | 3600 |
| CNAME | www | `cname.vercel-dns.com` | 3600 |

#### Option B: CNAME Record (For Subdomains)

| Type | Name | Value | TTL |
|------|------|-------|-----|
| CNAME | @ | `cname.vercel-dns.com` | 3600 |
| CNAME | www | `cname.vercel-dns.com` | 3600 |

**Note**: Some registrars don't support CNAME for root domains. Use Option A if you encounter issues.

### 1.3 Wait for DNS Propagation

- **Typical Time**: 5 minutes to 48 hours
- **Average Time**: 1-2 hours

**Check DNS Propagation**:
```bash
# Check if DNS has propagated
dig yourdomain.com

# Or use online tool
# Visit: https://www.whatsmydns.net/#A/yourdomain.com
```

### 1.4 Verify SSL Certificate

Once DNS propagates, Vercel automatically provisions an SSL certificate:

1. Return to Vercel Dashboard → Domains
2. Wait for domain status to show **"Valid Configuration"** with a green checkmark
3. SSL certificate is automatically issued (usually within 5 minutes)

**Verify SSL**:
```bash
# Check SSL certificate
curl -I https://yourdomain.com

# Should return 200 OK with valid SSL
```

---

## Step 2: Update Environment Variables

### 2.1 Update Production Environment Variables

1. **Navigate to Environment Variables**
   - Vercel Dashboard → Your Project → **Settings** → **Environment Variables**

2. **Update These Variables for Production**

   Click on each variable and update the value:

   | Variable | Old Value | New Value |
   |----------|-----------|-----------|
   | `NEXT_PUBLIC_APP_URL` | `https://ui-syncup.vercel.app` | `https://yourdomain.com` |
   | `NEXT_PUBLIC_API_URL` | `https://ui-syncup.vercel.app/api` | `https://yourdomain.com/api` |
   | `GOOGLE_REDIRECT_URI` | `https://ui-syncup.vercel.app/api/auth/callback/google` | `https://yourdomain.com/api/auth/callback/google` |
   | `BETTER_AUTH_URL` | `https://ui-syncup.vercel.app` | `https://yourdomain.com` |

3. **How to Update Each Variable**
   - Find the variable in the list
   - Click the **three-dot menu (⋯)** → **Edit**
   - Update the value
   - Ensure **"Production"** environment is selected
   - Click **"Save"**

### 2.2 Keep Preview Environment Variables

**Important**: Do NOT change preview environment variables. They should remain as:
- `NEXT_PUBLIC_APP_URL=https://preview-ui-syncup.vercel.app` (or similar)

This ensures preview deployments work correctly.

---

## Step 3: Update Google OAuth Configuration

### 3.1 Access Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to **APIs & Services** → **Credentials**

### 3.2 Update OAuth 2.0 Client

1. **Find Your OAuth Client**
   - Look for your OAuth 2.0 Client ID in the list
   - Click on the client name to edit

2. **Update Authorized JavaScript Origins**
   
   Add your custom domain:
   ```
   https://yourdomain.com
   ```

   Keep existing origins for development:
   ```
   http://localhost:3000
   https://preview-ui-syncup.vercel.app
   ```

3. **Update Authorized Redirect URIs**
   
   Add your custom domain callback:
   ```
   https://yourdomain.com/api/auth/callback/google
   ```

   Keep existing URIs for development:
   ```
   http://localhost:3000/api/auth/callback/google
   https://preview-ui-syncup.vercel.app/api/auth/callback/google
   ```

4. **Save Changes**
   - Click **"Save"** at the bottom
   - Changes take effect immediately

### 3.3 Verify OAuth Configuration

**Expected Configuration**:

**Authorized JavaScript origins**:
- `https://yourdomain.com`
- `http://localhost:3000` (development)
- `https://preview-ui-syncup.vercel.app` (preview)

**Authorized redirect URIs**:
- `https://yourdomain.com/api/auth/callback/google`
- `http://localhost:3000/api/auth/callback/google` (development)
- `https://preview-ui-syncup.vercel.app/api/auth/callback/google` (preview)

---

## Step 4: Update Supabase Configuration (If Using Supabase Auth)

### 4.1 Access Supabase Dashboard

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your production project
3. Navigate to **Authentication** → **URL Configuration**

### 4.2 Update Site URL

1. **Site URL**
   - Change from: `https://ui-syncup.vercel.app`
   - Change to: `https://yourdomain.com`

2. **Redirect URLs**
   
   Add your custom domain to the allowed list:
   ```
   https://yourdomain.com/**
   ```

   Keep existing URLs:
   ```
   http://localhost:3000/**
   https://preview-ui-syncup.vercel.app/**
   ```

3. **Save Changes**

---

## Step 5: Redeploy Application

After updating environment variables, you need to redeploy for changes to take effect.

### 5.1 Trigger Production Deployment

**Option A: Via Vercel Dashboard**
1. Go to **Deployments** tab
2. Find the latest production deployment
3. Click **three-dot menu (⋯)** → **Redeploy**
4. Select **"Use existing Build Cache"** (faster)
5. Click **"Redeploy"**

**Option B: Via Git Push**
```bash
# Make a small change to trigger deployment
git commit --allow-empty -m "chore: redeploy with custom domain"
git push origin main
```

**Option C: Via Vercel CLI**
```bash
# Deploy to production
vercel --prod
```

### 5.2 Monitor Deployment

1. Watch deployment progress in Vercel Dashboard
2. Wait for status to change to **"Ready"**
3. Typical deployment time: 2-5 minutes

---

## Step 6: Verify Configuration

### 6.1 Test Domain Access

**Basic Access**:
```bash
# Test domain resolves
curl -I https://yourdomain.com

# Expected: 200 OK with valid SSL
```

**Health Check**:
```bash
# Test health endpoint
curl https://yourdomain.com/api/health

# Expected response:
# {
#   "status": "ok",
#   "deployment": {...},
#   "timestamp": "..."
# }
```

### 6.2 Test Security Headers

```bash
# Check security headers
curl -I https://yourdomain.com

# Verify these headers are present:
# - Content-Security-Policy
# - X-Frame-Options: DENY
# - X-Content-Type-Options: nosniff
# - Strict-Transport-Security (HSTS)
```

### 6.3 Test CORS

```bash
# Test CORS preflight
curl -X OPTIONS \
     -H "Origin: https://yourdomain.com" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     https://yourdomain.com/api/health

# Expected headers in response:
# - Access-Control-Allow-Origin: https://yourdomain.com
# - Access-Control-Allow-Methods: GET,POST,PUT,PATCH,DELETE,OPTIONS
# - Access-Control-Allow-Credentials: true
```

### 6.4 Test Authentication Flow

1. **Open Your Domain**
   - Navigate to `https://yourdomain.com`

2. **Test Sign In**
   - Click "Sign In" button
   - Click "Sign in with Google"
   - Complete OAuth flow
   - Verify successful login

3. **Test Sign Up**
   - Sign out
   - Click "Sign Up"
   - Complete registration flow
   - Verify account creation

### 6.5 Test Core Functionality

- [ ] Homepage loads correctly
- [ ] Navigation works
- [ ] Create a new project
- [ ] Create a new issue
- [ ] Upload an image
- [ ] Add annotations
- [ ] All external services work (Supabase, R2, Google OAuth)

---

## Step 7: Update Documentation and Links

### 7.1 Update README.md

If your README contains the old domain, update it:

```bash
# Find and replace old domain
grep -r "ui-syncup.vercel.app" .
# Replace with: yourdomain.com
```

### 7.2 Update External Links

Update links in:
- [ ] Marketing website
- [ ] Social media profiles
- [ ] Email signatures
- [ ] Documentation sites
- [ ] Support articles

### 7.3 Set Up Redirects (Optional)

If you want to redirect old Vercel URLs to your custom domain:

1. Create `vercel.json` in project root:
```json
{
  "redirects": [
    {
      "source": "/:path*",
      "has": [
        {
          "type": "host",
          "value": "ui-syncup.vercel.app"
        }
      ],
      "destination": "https://yourdomain.com/:path*",
      "permanent": true
    }
  ]
}
```

2. Commit and deploy:
```bash
git add vercel.json
git commit -m "feat: redirect old domain to custom domain"
git push origin main
```

---

## Step 8: Set Up Monitoring and Analytics

### 8.1 Enable Vercel Analytics

1. Go to Vercel Dashboard → Your Project → **Analytics**
2. Click **"Enable Analytics"**
3. Update environment variable:
   ```bash
   NEXT_PUBLIC_ENABLE_ANALYTICS=true
   ```

### 8.2 Set Up Custom Monitoring (Optional)

Consider adding:
- **Google Analytics**: Track user behavior
- **Sentry**: Error tracking and monitoring
- **LogRocket**: Session replay and debugging
- **Uptime Monitoring**: Pingdom, UptimeRobot, or StatusCake

### 8.3 Set Up Status Page (Optional)

Create a status page to communicate outages:
- [Statuspage.io](https://www.statuspage.io/)
- [Instatus](https://instatus.com/)
- [Cachet](https://cachethq.io/) (self-hosted)

---

## Troubleshooting

### Domain Not Resolving

**Symptom**: `yourdomain.com` doesn't load or shows "DNS_PROBE_FINISHED_NXDOMAIN"

**Solutions**:
1. **Check DNS Configuration**
   ```bash
   dig yourdomain.com
   # Should show Vercel's IP or CNAME
   ```

2. **Wait for DNS Propagation**
   - Can take up to 48 hours
   - Check progress: https://www.whatsmydns.net/

3. **Verify DNS Records**
   - Double-check A or CNAME records in registrar
   - Ensure no typos in values
   - Remove any conflicting records

### SSL Certificate Issues

**Symptom**: "Your connection is not private" or SSL errors

**Solutions**:
1. **Wait for Certificate Provisioning**
   - Vercel automatically provisions SSL
   - Usually takes 5-10 minutes after DNS propagates

2. **Check Domain Status in Vercel**
   - Should show "Valid Configuration" with green checkmark
   - If showing error, click "Refresh" button

3. **Force Certificate Renewal**
   - Remove domain from Vercel
   - Wait 5 minutes
   - Re-add domain

### OAuth Errors

**Symptom**: "redirect_uri_mismatch" or OAuth fails

**Solutions**:
1. **Verify Google OAuth Configuration**
   - Check authorized redirect URIs include your domain
   - Ensure exact match (including `/api/auth/callback/google`)
   - No trailing slashes

2. **Check Environment Variables**
   ```bash
   # Verify in Vercel Dashboard
   GOOGLE_REDIRECT_URI=https://yourdomain.com/api/auth/callback/google
   ```

3. **Clear Browser Cache**
   - OAuth tokens may be cached
   - Try incognito/private browsing

### CORS Errors

**Symptom**: "CORS policy: No 'Access-Control-Allow-Origin' header"

**Solutions**:
1. **Verify Environment Variable**
   ```bash
   # Check in Vercel Dashboard
   NEXT_PUBLIC_APP_URL=https://yourdomain.com
   ```

2. **Redeploy Application**
   - Environment variable changes require redeployment
   - Trigger new deployment from Vercel Dashboard

3. **Check Browser Console**
   - Look for specific CORS error details
   - Verify origin matches exactly (no trailing slash)

### WWW Subdomain Issues

**Symptom**: `www.yourdomain.com` doesn't redirect to `yourdomain.com`

**Solutions**:
1. **Add WWW Domain in Vercel**
   - Settings → Domains → Add `www.yourdomain.com`
   - Vercel automatically sets up redirect

2. **Check DNS for WWW**
   ```bash
   dig www.yourdomain.com
   # Should show CNAME to cname.vercel-dns.com
   ```

### Application Not Loading After Domain Change

**Symptom**: Domain resolves but application shows errors

**Solutions**:
1. **Check Health Endpoint**
   ```bash
   curl https://yourdomain.com/api/health
   ```

2. **Review Deployment Logs**
   - Vercel Dashboard → Deployments → Latest → View Logs
   - Look for environment variable errors

3. **Verify All Environment Variables Updated**
   - Check each variable in Vercel Dashboard
   - Ensure production environment selected

4. **Rollback if Needed**
   - Vercel Dashboard → Deployments
   - Find previous working deployment
   - Click "Promote to Production"

---

## Post-Setup Checklist

After completing all steps, verify:

- [ ] Domain resolves to your application
- [ ] SSL certificate is valid (green padlock in browser)
- [ ] All environment variables updated in Vercel
- [ ] Google OAuth configured with new domain
- [ ] Supabase configured with new domain (if applicable)
- [ ] Application redeployed with new configuration
- [ ] Health endpoint responds correctly
- [ ] Security headers present in responses
- [ ] CORS working for API requests
- [ ] Authentication flow works (sign in/sign up)
- [ ] Core functionality tested (projects, issues, uploads)
- [ ] WWW subdomain redirects correctly (if configured)
- [ ] Old Vercel domain redirects to new domain (if configured)
- [ ] Documentation updated with new domain
- [ ] Team notified of domain change
- [ ] Monitoring and analytics configured

---

## Maintenance

### Regular Checks

**Weekly**:
- [ ] Monitor SSL certificate expiry (Vercel auto-renews)
- [ ] Check domain DNS health
- [ ] Review error logs for domain-related issues

**Monthly**:
- [ ] Verify all redirect rules working
- [ ] Check analytics for traffic patterns
- [ ] Review and update documentation

**Annually**:
- [ ] Renew domain registration
- [ ] Review and update OAuth configurations
- [ ] Audit all external service integrations

### Domain Renewal

**Important**: Set up auto-renewal with your domain registrar to avoid expiration.

**Expiration Reminders**:
1. Set calendar reminders 90, 30, and 7 days before expiration
2. Enable email notifications from registrar
3. Keep payment method up to date

---

## Additional Resources

- [Vercel Custom Domains Documentation](https://vercel.com/docs/concepts/projects/domains)
- [Google OAuth Setup Guide](https://developers.google.com/identity/protocols/oauth2)
- [Supabase Auth Configuration](https://supabase.com/docs/guides/auth)
- [DNS Propagation Checker](https://www.whatsmydns.net/)
- [SSL Certificate Checker](https://www.sslshopper.com/ssl-checker.html)

---

## Support

If you encounter issues:

1. **Check Troubleshooting Section** above
2. **Review Vercel Deployment Logs**
3. **Check Service Status Pages**:
   - Vercel: https://www.vercel-status.com
   - Google: https://www.google.com/appsstatus
   - Supabase: https://status.supabase.com
4. **Contact Support**:
   - Vercel Support: https://vercel.com/support
   - Team Lead or DevOps

---

**Congratulations!** 🎉

Your custom domain is now configured and ready to use. Your application is accessible at `https://yourdomain.com` with full security headers, CORS protection, and OAuth integration.

---

**Last Updated**: 2025-11-17  
**Version**: 1.0
