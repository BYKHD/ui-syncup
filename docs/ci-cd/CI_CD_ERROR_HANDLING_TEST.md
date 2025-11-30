# CI/CD Error Handling Test Documentation

This document describes the error handling test procedures for the GitHub Actions CI/CD pipeline.

## Overview

The CI/CD pipeline includes error handling for:
1. **Migration failures** - Invalid SQL, connection errors, schema conflicts
2. **Missing secrets** - DEV_DIRECT_URL or PROD_DIRECT_URL not configured
3. **Quality check failures** - TypeScript, ESLint, test, or build failures

## Requirements Validated

- **2.5**: WHEN migrations fail on preview THEN the system SHALL halt deployment
- **3.5**: WHEN migrations fail on production THEN the system SHALL halt deployment  
- **4.3**: WHEN a migration fails THEN the system SHALL capture the error message, exit with non-zero status
- **5.4**: WHEN environment secrets are missing THEN the system SHALL fail with clear error message

## Error Handling Features

### 1. Migration Failure Handling

The deploy workflow now includes:

- **Exit code capture**: Migration exit codes are captured and propagated
- **Error annotations**: GitHub Actions error annotations (`::error::`) for clear visibility
- **Detailed logging**: Migration output is logged and preserved
- **Deployment halt**: Failed migrations prevent any subsequent deployment steps

### 2. Missing Secrets Detection

Before running migrations, the workflow verifies:

- `DEV_DIRECT_URL` is configured for Preview environment
- `PROD_DIRECT_URL` is configured for Production environment

If secrets are missing, the workflow:
- Fails immediately with a clear error message
- Provides instructions on how to add the missing secret
- Prevents migration from running with invalid credentials

### 3. Success Summary

On successful migrations, a summary is added to the GitHub Actions run showing:
- Branch name
- Commit SHA
- Environment (Preview/Production)
- Status

## Test Procedures

### Test 1: Failing Migration

**Purpose**: Verify that invalid migrations halt deployment

**Steps**:
1. Create a test branch
2. Add a migration with invalid SQL (e.g., referencing non-existent table)
3. Push to GitHub
4. Verify workflow fails at migration step
5. Verify error message is clear
6. Verify no deployment occurs

**Expected Results**:
- ✅ Workflow status: `failure`
- ✅ Error message mentions the invalid SQL
- ✅ Migration step shows red X
- ✅ No Vercel deployment triggered

**Test Script**: `scripts/test-ci-error-handling.sh`

### Test 2: Missing Secrets

**Purpose**: Verify that missing secrets are detected early

**Steps**:
1. Create a new GitHub environment without secrets
2. Trigger workflow targeting that environment
3. Verify workflow fails at secret verification step

**Expected Results**:
- ✅ Workflow fails before migration runs
- ✅ Error message identifies which secret is missing
- ✅ Instructions provided for adding the secret

### Test 3: Quality Check Failures

**Purpose**: Verify CI quality checks block merging

**Steps**:
1. Create branch with TypeScript errors
2. Push and verify workflow fails
3. Create branch with ESLint errors
4. Push and verify workflow fails
5. Create branch with failing tests
6. Push and verify workflow fails

**Expected Results**:
- ✅ Each type of failure is clearly identified
- ✅ Commit status shows failure
- ✅ PR cannot be merged (if branch protection enabled)

## Running the Tests

### Automated Test Script

```bash
# Run the error handling test script
./scripts/test-ci-error-handling.sh
```

This script will:
1. Create a test branch with a failing migration
2. Push to GitHub
3. Monitor the workflow
4. Report results
5. Clean up test artifacts

### Manual Testing

1. **Create failing migration**:
```sql
-- drizzle/9999_test_failing.sql
ALTER TABLE "non_existent_table" ADD COLUMN "test" varchar(50);
```

2. **Update journal** (`drizzle/meta/_journal.json`):
```json
{
  "idx": N,
  "version": "7",
  "when": TIMESTAMP,
  "tag": "9999_test_failing",
  "breakpoints": true
}
```

3. **Commit and push**:
```bash
git add drizzle/
git commit -m "test: add failing migration"
git push origin test-branch
```

4. **Monitor workflow**:
- Go to GitHub Actions tab
- Watch the Deploy workflow
- Verify it fails at migration step

5. **Clean up**:
```bash
git checkout develop
git branch -D test-branch
git push origin --delete test-branch
```

## Workflow Error Messages

### Migration Failure
```
::error::Migration failed with exit code 1
::error::Review the migration output above for details
---
MIGRATION FAILED - Deployment will be halted
```

### Missing Secret
```
::error::DEV_DIRECT_URL secret is not configured. Please add it to the Preview environment.
Go to: Settings → Environments → Preview → Add secret
```

## Verification Checklist

After running error handling tests, verify:

- [ ] Failing migrations halt the workflow
- [ ] Error messages are clear and actionable
- [ ] Exit codes are non-zero on failure
- [ ] Missing secrets are detected before migration runs
- [ ] No deployment occurs after migration failure
- [ ] Workflow logs contain sufficient detail for debugging
- [ ] GitHub Actions annotations highlight errors

## Related Files

- `.github/workflows/deploy.yml` - Deploy workflow with error handling
- `.github/workflows/ci.yml` - CI quality checks workflow
- `scripts/test-ci-error-handling.sh` - Automated test script
- `docs/CI_CD_SETUP.md` - Full CI/CD documentation
