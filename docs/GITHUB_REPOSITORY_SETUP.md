# GitHub Repository Configuration Guide

This guide walks you through configuring GitHub repository settings for the CI/CD pipeline, including environments, secrets, and branch protection rules.

## Prerequisites

- Admin access to the GitHub repository
- DEV_DIRECT_URL and PROD_DIRECT_URL values from your Supabase instances

## Task 4.1: Create GitHub Environments

### Steps:

1. **Navigate to Repository Settings**
   - Go to your repository on GitHub
   - Click **Settings** tab
   - In the left sidebar, click **Environments**

2. **Create Preview Environment**
   - Click **New environment**
   - Name: `Preview`
   - Click **Configure environment**
   - (Optional) Add deployment protection rules if desired
   - Click **Save protection rules**

3. **Create Production Environment**
   - Click **New environment** again
   - Name: `Production`
   - Click **Configure environment**
   - **Recommended:** Add protection rules:
     - ✅ **Required reviewers**: Add team members who should approve production deployments
     - ✅ **Wait timer**: Set to 0 minutes (or add delay if desired)
     - ✅ **Deployment branches**: Select "Protected branches only"
   - Click **Save protection rules**

### Verification:
- You should see both "Preview" and "Production" environments listed
- Production should show protection rules if configured

---

## Task 4.2: Add Environment Secrets

### Steps:

1. **Add DEV_DIRECT_URL to Preview Environment**
   - In **Settings** → **Environments**, click **Preview**
   - Scroll to **Environment secrets** section
   - Click **Add secret**
   - Name: `DEV_DIRECT_URL`
   - Value: Your Supabase dev database direct URL
     ```
     postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres?sslmode=require
     ```
   - Click **Add secret**

2. **Add PROD_DIRECT_URL to Production Environment**
   - Go back to **Environments**, click **Production**
   - Scroll to **Environment secrets** section
   - Click **Add secret**
   - Name: `PROD_DIRECT_URL`
   - Value: Your Supabase production database direct URL
     ```
     postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres?sslmode=require
     ```
   - Click **Add secret**

### Finding Your Supabase Direct URLs:

**For Dev Database:**
1. Go to Supabase Dashboard → Your Dev Project
2. Click **Settings** → **Database**
3. Scroll to **Connection string** section
4. Select **URI** tab
5. Copy the connection string (it includes the password)

**For Production Database:**
1. Go to Supabase Dashboard → Your Production Project
2. Follow the same steps as above

### Verification:
- Preview environment should show 1 secret: `DEV_DIRECT_URL`
- Production environment should show 1 secret: `PROD_DIRECT_URL`
- Secret values are hidden (only names visible)

---

## Task 4.3: Configure Branch Protection for Main

### Steps:

1. **Navigate to Branch Protection Settings**
   - In repository **Settings**, click **Branches** in left sidebar
   - Under **Branch protection rules**, click **Add rule** (or **Add branch protection rule**)

2. **Configure Branch Name Pattern**
   - Branch name pattern: `main`
   - This will protect the main branch

3. **Enable Required Status Checks**
   - ✅ Check **Require status checks to pass before merging**
   - ✅ Check **Require branches to be up to date before merging**
   - In the search box, type: `quality-checks`
   - Select the `quality-checks` status check when it appears
   - (Note: This check will only appear after the CI workflow has run at least once)

4. **Enable Pull Request Reviews**
   - ✅ Check **Require a pull request before merging**
   - ✅ Check **Require approvals**
   - Set **Required number of approvals before merging**: `1`
   - (Optional) ✅ Check **Dismiss stale pull request approvals when new commits are pushed**
   - (Optional) ✅ Check **Require review from Code Owners**

5. **Additional Recommended Settings**
   - ✅ Check **Require conversation resolution before merging**
   - ✅ Check **Do not allow bypassing the above settings**
   - ✅ Check **Include administrators** (ensures even admins follow the rules)
   - ✅ Check **Restrict who can push to matching branches** (optional, for stricter control)

6. **Save the Rule**
   - Scroll to bottom and click **Create** (or **Save changes**)

### Important Notes:

- **First-time setup**: The `quality-checks` status check won't appear in the dropdown until the CI workflow has run at least once. You may need to:
  1. Create the branch protection rule without the status check first
  2. Push a commit to trigger the CI workflow
  3. Edit the branch protection rule to add the `quality-checks` status check

- **Testing the setup**: After configuration, try to:
  1. Push directly to main (should be blocked)
  2. Create a PR without approval (should be blocked from merging)
  3. Create a PR with failing CI (should be blocked from merging)

### Verification Checklist:
- [ ] Branch protection rule exists for `main`
- [ ] Status check `quality-checks` is required
- [ ] Branches must be up to date before merging
- [ ] Pull request reviews required (1 approval)
- [ ] Administrators are included in restrictions
- [ ] Direct pushes to main are blocked

---

## Alternative: Using GitHub CLI

If you prefer command-line configuration, you can use the GitHub CLI:

### Install GitHub CLI:
```bash
# macOS
brew install gh

# Login
gh auth login
```

### Create Environments:
```bash
# Note: Environment creation via CLI requires GitHub Enterprise
# For standard repos, use the web interface
```

### Add Secrets:
```bash
# Add Preview environment secret
gh secret set DEV_DIRECT_URL --env Preview --body "your-dev-database-url"

# Add Production environment secret
gh secret set PROD_DIRECT_URL --env Production --body "your-prod-database-url"
```

### Configure Branch Protection:
```bash
gh api repos/:owner/:repo/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["quality-checks"]}' \
  --field required_pull_request_reviews='{"required_approving_review_count":1}' \
  --field enforce_admins=true \
  --field restrictions=null
```

---

## Troubleshooting

### "quality-checks" status check not appearing:
- The workflow must run at least once before the status check appears
- Push a commit to any branch to trigger the CI workflow
- Wait for the workflow to complete
- Return to branch protection settings and add the status check

### Secrets not working in workflows:
- Verify secret names match exactly (case-sensitive)
- Check that secrets are added to the correct environment (Preview vs Production)
- Review workflow logs for "secret not found" errors
- Ensure the workflow references the correct environment name

### Branch protection too strict:
- You can temporarily disable "Include administrators" to bypass rules during setup
- Re-enable after testing is complete

### Cannot merge PRs:
- Ensure all required status checks have passed
- Verify you have the required number of approvals
- Check that the branch is up to date with main

---

## Security Best Practices

1. **Rotate secrets regularly**: Update database URLs and passwords periodically
2. **Limit secret access**: Only add secrets to environments that need them
3. **Use environment protection**: Require approvals for production deployments
4. **Audit access**: Regularly review who has admin access to the repository
5. **Monitor workflow runs**: Check for unauthorized or suspicious workflow executions

---

## Next Steps

After completing this configuration:

1. ✅ Verify environments are created
2. ✅ Verify secrets are added
3. ✅ Verify branch protection is enabled
4. 🔄 Test the setup by creating a test PR
5. 🔄 Proceed to Task 5: Verify Vercel integration

---

## References

- [GitHub Environments Documentation](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment)
- [GitHub Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Branch Protection Rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [GitHub CLI Documentation](https://cli.github.com/manual/)
