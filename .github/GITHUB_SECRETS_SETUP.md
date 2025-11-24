# 🔐 GitHub Secrets Setup Guide

This guide will help you configure GitHub Secrets for automated CI/CD deployments with database migrations.

---

## 📋 Required Secrets

You need to add these secrets to your GitHub repository for the deployment workflow to function:

| Secret Name | Description | Where to Find It |
|------------|-------------|------------------|
| `DEV_DIRECT_URL` | Development database direct connection string | Supabase Dev Project → Settings → Database → Connection String (Direct) |
| `PROD_DIRECT_URL` | Production database direct connection string | Supabase Prod Project → Settings → Database → Connection String (Direct) |

---

## 🚀 Step-by-Step Setup

### Method 1: Using GitHub Web Interface (Easiest)

1. **Go to your GitHub repository**
   - Navigate to: `https://github.com/YOUR_USERNAME/ui-syncup`

2. **Access Settings**
   - Click on **Settings** tab (top right)

3. **Navigate to Secrets**
   - In left sidebar: **Secrets and variables** → **Actions**

4. **Add New Secret**
   - Click **"New repository secret"** button

5. **Add DEV_DIRECT_URL**
   - **Name:** `DEV_DIRECT_URL`
   - **Value:** Your development database connection string
   - Click **"Add secret"**

6. **Add PROD_DIRECT_URL**
   - Click **"New repository secret"** again
   - **Name:** `PROD_DIRECT_URL`
   - **Value:** Your production database connection string
   - Click **"Add secret"**

---

### Method 2: Using GitHub CLI (For Power Users)

```bash
# Install GitHub CLI if you haven't already
# macOS: brew install gh
# Windows: winget install GitHub.cli

# Authenticate
gh auth login

# Add DEV_DIRECT_URL secret
gh secret set DEV_DIRECT_URL --body "postgresql://postgres.vgmarozegrghrpgopmbs:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require"

# Add PROD_DIRECT_URL secret
gh secret set PROD_DIRECT_URL --body "postgresql://postgres.nkkwmkrzhilpcxrjqxrb:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require"

# Verify secrets were added
gh secret list
```

---

## 🔍 How to Get Your Database Connection Strings

### For Development Database:

1. **Go to Supabase Dashboard**
   - Navigate to: `https://supabase.com/dashboard/project/vgmarozegrghrpgopmbs`

2. **Access Database Settings**
   - Left sidebar → **Settings** (gear icon) → **Database**

3. **Find Connection String**
   - Scroll to **"Connection string"** section
   - Select **"URI"** tab
   - Toggle to show **"Direct connection"** (not Transaction or Session pooling)
   - Copy the connection string

4. **Replace Password**
   - The string will look like: `postgresql://postgres.vgmarozegrghrpgopmbs:[YOUR-PASSWORD]@...`
   - Replace `[YOUR-PASSWORD]` with your actual database password
   - **Note:** If you don't remember your password, you can reset it in the same Database settings page

### For Production Database:

Repeat the same steps above but for your production project:
- Navigate to: `https://supabase.com/dashboard/project/nkkwmkrzhilpcxrjqxrb`
- Follow steps 2-4 above

---

## ✅ Verification

After adding the secrets, verify they are set correctly:

### Via GitHub Web Interface:
1. Go to **Settings** → **Secrets and variables** → **Actions**
2. You should see:
   - ✅ `DEV_DIRECT_URL` (Updated X seconds/minutes ago)
   - ✅ `PROD_DIRECT_URL` (Updated X seconds/minutes ago)

### Via GitHub CLI:
```bash
gh secret list
```

Expected output:
```
DEV_DIRECT_URL    Updated 2024-11-24
PROD_DIRECT_URL   Updated 2024-11-24
```

---

## 🧪 Testing the Setup

After adding secrets, test the workflow:

### Option 1: Push to Develop Branch
```bash
git checkout develop
git add .
git commit -m "test: verify CI/CD setup"
git push origin develop
```

### Option 2: Push to Main Branch
```bash
# Only do this after testing on develop!
git checkout main
git merge develop
git push origin main
```

### Check GitHub Actions:
1. Go to **Actions** tab in your repository
2. You should see **"Deploy & Migrate"** workflow running
3. Click on the workflow run to see logs
4. Verify migrations are running successfully

---

## 🔒 Security Best Practices

### ✅ DO:
- ✅ Use GitHub Secrets for sensitive data (never commit connection strings)
- ✅ Use different database credentials for dev and prod
- ✅ Regularly rotate database passwords
- ✅ Limit database user permissions (principle of least privilege)
- ✅ Use direct connection strings for migrations (not pooled)
- ✅ Keep production secrets restricted to main branch only (GitHub environments)

### ❌ DON'T:
- ❌ Commit database credentials to `.env` files
- ❌ Share secrets in Slack/Discord/email
- ❌ Use production database credentials in development
- ❌ Give developers direct production database access
- ❌ Log or print secret values in CI/CD logs

---

## 🛠️ Troubleshooting

### Issue: "Secret not found" error in workflow

**Solution:**
1. Verify secret name matches exactly (case-sensitive)
2. Check that secret is added to the correct repository
3. Ensure you're not using organization secrets (unless configured)

### Issue: "Database connection failed" error

**Solution:**
1. Verify connection string format is correct
2. Check that password is correct (no special characters causing issues)
3. Ensure Supabase project is not paused
4. Verify IP allowlist in Supabase (GitHub Actions IPs need access)

### Issue: "Permission denied" error

**Solution:**
1. Check database user has sufficient permissions
2. Ensure database user can create/modify tables
3. Verify SSL mode is set correctly (`sslmode=require`)

---

## 🌐 GitHub Actions IP Addresses

If your Supabase project has IP restrictions, you need to allowlist GitHub Actions IPs:

**Supabase Configuration:**
1. Go to **Settings** → **Database**
2. Scroll to **"Connection pooling"**
3. Under **"IP Address Restrictions"**, select **"Allow all"** or add GitHub's IP ranges

**GitHub Actions IP Ranges:** (These change, so it's recommended to allow all for GitHub Actions)
- Check latest IPs at: https://api.github.com/meta

---

## 📚 Additional Resources

- [GitHub Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Supabase Database Settings](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Drizzle with Supabase Guide](https://orm.drizzle.team/docs/get-started-postgresql#supabase)

---

## 🆘 Need Help?

If you encounter issues:
1. Check GitHub Actions logs for specific error messages
2. Verify secrets are correctly formatted
3. Test database connection locally with the same connection string
4. Reach out to the team for assistance

---

**Last Updated:** 2024-11-24
