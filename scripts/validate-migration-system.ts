#!/usr/bin/env bun
/**
 * Migration System Validation Script
 * 
 * This script validates that the automated migration system is properly configured
 * and ready for production deployment. It checks:
 * - Environment configuration
 * - Database connectivity
 * - Migration script functionality
 * - GitHub Actions workflow configuration
 * - Documentation completeness
 * 
 * Run this script before deploying to production to ensure everything is set up correctly.
 */

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

// ============================================================================
// Types
// ============================================================================

interface ValidationResult {
  category: string;
  check: string;
  passed: boolean;
  message: string;
  severity: "error" | "warning" | "info";
}

interface ValidationSummary {
  total: number;
  passed: number;
  failed: number;
  warnings: number;
  results: ValidationResult[];
}

// ============================================================================
// Validation Functions
// ============================================================================

const results: ValidationResult[] = [];

function addResult(
  category: string,
  check: string,
  passed: boolean,
  message: string,
  severity: "error" | "warning" | "info" = "error"
): void {
  results.push({ category, check, passed, message, severity });
}

/**
 * Validate environment configuration
 */
function validateEnvironment(): void {
  console.log("\n📝 Validating Environment Configuration...");

  // Check for .env.local file
  const envLocalExists = fs.existsSync(".env.local");
  addResult(
    "Environment",
    ".env.local file exists",
    envLocalExists,
    envLocalExists
      ? ".env.local file found"
      : ".env.local file not found (required for local testing)",
    envLocalExists ? "info" : "warning"
  );

  // Check for DIRECT_URL in environment
  const hasDirectUrl = !!process.env.DIRECT_URL;
  addResult(
    "Environment",
    "DIRECT_URL configured",
    hasDirectUrl,
    hasDirectUrl
      ? "DIRECT_URL environment variable is set"
      : "DIRECT_URL not set (required for migration testing)",
    hasDirectUrl ? "info" : "warning"
  );

  // Validate DIRECT_URL format if present
  if (hasDirectUrl) {
    try {
      const url = new URL(process.env.DIRECT_URL!);
      const isPostgres = url.protocol.startsWith("postgres");
      addResult(
        "Environment",
        "DIRECT_URL format valid",
        isPostgres,
        isPostgres
          ? "DIRECT_URL has valid PostgreSQL format"
          : `Invalid protocol: ${url.protocol} (expected postgres:// or postgresql://)`
      );
    } catch (error) {
      addResult(
        "Environment",
        "DIRECT_URL format valid",
        false,
        `Invalid URL format: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

/**
 * Validate migration script exists and is executable
 */
function validateMigrationScript(): void {
  console.log("\n🔧 Validating Migration Script...");

  // Check if migrate.ts exists
  const migrateScriptPath = "scripts/migrate.ts";
  const scriptExists = fs.existsSync(migrateScriptPath);
  addResult(
    "Migration Script",
    "migrate.ts exists",
    scriptExists,
    scriptExists
      ? "Migration script found at scripts/migrate.ts"
      : "Migration script not found at scripts/migrate.ts"
  );

  if (scriptExists) {
    // Check if script has shebang
    const scriptContent = fs.readFileSync(migrateScriptPath, "utf-8");
    const hasShebang = scriptContent.startsWith("#!/usr/bin/env bun");
    addResult(
      "Migration Script",
      "Script has shebang",
      hasShebang,
      hasShebang
        ? "Script has correct shebang (#!/usr/bin/env bun)"
        : "Script missing shebang",
      "warning"
    );

    // Check for key functions
    const hasValidateEnvironment = scriptContent.includes("validateEnvironment");
    const hasTestConnection = scriptContent.includes("testDatabaseConnection");
    const hasValidateMigrations = scriptContent.includes("validateMigrationFiles");
    const hasFormatError = scriptContent.includes("formatError");

    addResult(
      "Migration Script",
      "Environment validation function",
      hasValidateEnvironment,
      hasValidateEnvironment
        ? "validateEnvironment function found"
        : "validateEnvironment function missing"
    );

    addResult(
      "Migration Script",
      "Connection test function",
      hasTestConnection,
      hasTestConnection
        ? "testDatabaseConnection function found"
        : "testDatabaseConnection function missing"
    );

    addResult(
      "Migration Script",
      "Migration validation function",
      hasValidateMigrations,
      hasValidateMigrations
        ? "validateMigrationFiles function found"
        : "validateMigrationFiles function missing"
    );

    addResult(
      "Migration Script",
      "Error formatting function",
      hasFormatError,
      hasFormatError ? "formatError function found" : "formatError function missing"
    );
  }
}

/**
 * Validate migration files
 */
function validateMigrationFiles(): void {
  console.log("\n📂 Validating Migration Files...");

  const migrationsFolder = "drizzle";
  const folderExists = fs.existsSync(migrationsFolder);

  addResult(
    "Migration Files",
    "Migrations folder exists",
    folderExists,
    folderExists
      ? "drizzle/ folder found"
      : "drizzle/ folder not found (will be created on first migration)"
  );

  if (folderExists) {
    const files = fs.readdirSync(migrationsFolder);
    const sqlFiles = files.filter((f) => f.endsWith(".sql"));

    addResult(
      "Migration Files",
      "Migration files found",
      sqlFiles.length > 0,
      `Found ${sqlFiles.length} migration file(s)`,
      "info"
    );

    // Validate naming convention
    let validNaming = true;
    const invalidFiles: string[] = [];

    for (const file of sqlFiles) {
      if (!/^\d{4}_[a-z0-9_]+\.sql$/.test(file)) {
        validNaming = false;
        invalidFiles.push(file);
      }
    }

    addResult(
      "Migration Files",
      "Naming convention valid",
      validNaming,
      validNaming
        ? "All migration files follow naming convention"
        : `Invalid file names: ${invalidFiles.join(", ")}`,
      validNaming ? "info" : "warning"
    );

    // Check for meta folder
    const metaExists = fs.existsSync(path.join(migrationsFolder, "meta"));
    addResult(
      "Migration Files",
      "Meta folder exists",
      metaExists,
      metaExists
        ? "drizzle/meta/ folder found"
        : "drizzle/meta/ folder not found",
      metaExists ? "info" : "warning"
    );
  }
}

/**
 * Validate GitHub Actions workflow
 */
function validateGitHubWorkflow(): void {
  console.log("\n⚙️  Validating GitHub Actions Workflow...");

  const workflowPath = ".github/workflows/deploy.yml";
  const workflowExists = fs.existsSync(workflowPath);

  addResult(
    "GitHub Actions",
    "Workflow file exists",
    workflowExists,
    workflowExists
      ? "deploy.yml workflow found"
      : "deploy.yml workflow not found at .github/workflows/deploy.yml"
  );

  if (workflowExists) {
    const workflowContent = fs.readFileSync(workflowPath, "utf-8");

    // Check for required jobs
    const hasMigratePreview = workflowContent.includes("migrate-preview");
    const hasMigrateProduction = workflowContent.includes("migrate-production");

    addResult(
      "GitHub Actions",
      "Preview migration job",
      hasMigratePreview,
      hasMigratePreview
        ? "migrate-preview job found"
        : "migrate-preview job missing"
    );

    addResult(
      "GitHub Actions",
      "Production migration job",
      hasMigrateProduction,
      hasMigrateProduction
        ? "migrate-production job found"
        : "migrate-production job missing"
    );

    // Check for environment configuration
    const hasPreviewEnv = workflowContent.includes("environment: Preview");
    const hasProductionEnv = workflowContent.includes("environment: Production");

    addResult(
      "GitHub Actions",
      "Preview environment configured",
      hasPreviewEnv,
      hasPreviewEnv
        ? "Preview environment configured"
        : "Preview environment not configured"
    );

    addResult(
      "GitHub Actions",
      "Production environment configured",
      hasProductionEnv,
      hasProductionEnv
        ? "Production environment configured"
        : "Production environment not configured"
    );

    // Check for secret validation
    const hasSecretValidation = workflowContent.includes("Verify environment secrets");

    addResult(
      "GitHub Actions",
      "Secret validation step",
      hasSecretValidation,
      hasSecretValidation
        ? "Secret validation step found"
        : "Secret validation step missing",
      hasSecretValidation ? "info" : "warning"
    );

    // Check for migration summary
    const hasSummary = workflowContent.includes("Migration success summary");

    addResult(
      "GitHub Actions",
      "Migration summary generation",
      hasSummary,
      hasSummary
        ? "Migration summary generation found"
        : "Migration summary generation missing",
      hasSummary ? "info" : "warning"
    );
  }
}

/**
 * Validate documentation
 */
function validateDocumentation(): void {
  console.log("\n📚 Validating Documentation...");

  const docs = [
    { path: "docs/ci-cd/CI_CD_SETUP.md", name: "CI/CD Setup Guide" },
    { path: "docs/database/MIGRATION_TROUBLESHOOTING.md", name: "Migration Troubleshooting" },
    { path: "docs/database/MIGRATION_BEST_PRACTICES.md", name: "Migration Best Practices" },
    { path: "docs/database/MIGRATION_ROLLBACK.md", name: "Migration Rollback Guide" },
    { path: "docs/ci-cd/PRODUCTION_READINESS_CHECKLIST.md", name: "Production Readiness Checklist" },
  ];

  for (const doc of docs) {
    const exists = fs.existsSync(doc.path);
    addResult(
      "Documentation",
      doc.name,
      exists,
      exists ? `${doc.name} found` : `${doc.name} not found at ${doc.path}`,
      exists ? "info" : "warning"
    );
  }
}

/**
 * Validate test coverage
 */
function validateTests(): void {
  console.log("\n🧪 Validating Test Coverage...");

  const testFiles = [
    { path: "scripts/__tests__/migrate.test.ts", name: "Unit tests" },
    { path: "scripts/__tests__/migrate.property.test.ts", name: "Property tests" },
    { path: "scripts/__tests__/migrate.integration.test.ts", name: "Integration tests" },
  ];

  for (const test of testFiles) {
    const exists = fs.existsSync(test.path);
    addResult(
      "Tests",
      test.name,
      exists,
      exists ? `${test.name} found` : `${test.name} not found at ${test.path}`,
      exists ? "info" : "warning"
    );
  }

  // Try to run tests
  try {
    console.log("   Running tests...");
    execSync("bun run test scripts/__tests__/migrate --run", {
      stdio: "pipe",
      encoding: "utf-8",
    });
    addResult(
      "Tests",
      "Test execution",
      true,
      "All tests passed",
      "info"
    );
  } catch (error) {
    addResult(
      "Tests",
      "Test execution",
      false,
      "Some tests failed - review test output",
      "warning"
    );
  }
}

/**
 * Validate package.json scripts
 */
function validatePackageScripts(): void {
  console.log("\n📦 Validating Package Scripts...");

  const packageJsonPath = "package.json";
  if (!fs.existsSync(packageJsonPath)) {
    addResult(
      "Package Scripts",
      "package.json exists",
      false,
      "package.json not found"
    );
    return;
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
  const scripts = packageJson.scripts || {};

  const requiredScripts = [
    { name: "db:generate", description: "Generate migrations" },
    { name: "db:migrate", description: "Run migrations" },
    { name: "db:push", description: "Push schema to database" },
    { name: "db:studio", description: "Open Drizzle Studio" },
  ];

  for (const script of requiredScripts) {
    const exists = !!scripts[script.name];
    addResult(
      "Package Scripts",
      script.name,
      exists,
      exists
        ? `${script.name} script found (${script.description})`
        : `${script.name} script missing`,
      exists ? "info" : "warning"
    );
  }
}

// ============================================================================
// Summary and Reporting
// ============================================================================

function printSummary(summary: ValidationSummary): void {
  console.log("\n" + "=".repeat(80));
  console.log("📊 VALIDATION SUMMARY");
  console.log("=".repeat(80));

  // Group results by category
  const categories = new Map<string, ValidationResult[]>();
  for (const result of summary.results) {
    if (!categories.has(result.category)) {
      categories.set(result.category, []);
    }
    categories.get(result.category)!.push(result);
  }

  // Print results by category
  for (const [category, categoryResults] of categories) {
    console.log(`\n${category}:`);
    for (const result of categoryResults) {
      const icon = result.passed ? "✅" : result.severity === "warning" ? "⚠️ " : "❌";
      const status = result.passed ? "PASS" : result.severity === "warning" ? "WARN" : "FAIL";
      console.log(`  ${icon} [${status}] ${result.check}`);
      console.log(`      ${result.message}`);
    }
  }

  // Print overall summary
  console.log("\n" + "=".repeat(80));
  console.log(`Total Checks: ${summary.total}`);
  console.log(`✅ Passed: ${summary.passed}`);
  console.log(`❌ Failed: ${summary.failed}`);
  console.log(`⚠️  Warnings: ${summary.warnings}`);
  console.log("=".repeat(80));

  // Determine overall status
  if (summary.failed === 0) {
    console.log("\n🎉 All critical checks passed! System is ready for production.");
    if (summary.warnings > 0) {
      console.log(`⚠️  Note: ${summary.warnings} warning(s) found. Review and address if needed.`);
    }
  } else {
    console.log(`\n❌ ${summary.failed} critical check(s) failed. Address these before production deployment.`);
  }

  console.log("\n📋 Next Steps:");
  if (summary.failed > 0) {
    console.log("   1. Review failed checks above");
    console.log("   2. Fix identified issues");
    console.log("   3. Re-run this validation script");
    console.log("   4. Proceed to production readiness checklist");
  } else {
    console.log("   1. Review the Production Readiness Checklist:");
    console.log("      docs/ci-cd/PRODUCTION_READINESS_CHECKLIST.md");
    console.log("   2. Complete all checklist items");
    console.log("   3. Obtain team sign-off");
    console.log("   4. Schedule production deployment");
  }

  console.log("\n📚 Documentation:");
  console.log("   - CI/CD Setup: docs/ci-cd/CI_CD_SETUP.md");
  console.log("   - Troubleshooting: docs/database/MIGRATION_TROUBLESHOOTING.md");
  console.log("   - Best Practices: docs/database/MIGRATION_BEST_PRACTICES.md");
  console.log("   - Rollback Guide: docs/database/MIGRATION_ROLLBACK.md");
  console.log();
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  console.log("🔍 Migration System Validation");
  console.log("=".repeat(80));
  console.log("This script validates that the automated migration system is properly");
  console.log("configured and ready for production deployment.");
  console.log("=".repeat(80));

  // Run all validations
  validateEnvironment();
  validateMigrationScript();
  validateMigrationFiles();
  validateGitHubWorkflow();
  validateDocumentation();
  validateTests();
  validatePackageScripts();

  // Calculate summary
  const summary: ValidationSummary = {
    total: results.length,
    passed: results.filter((r) => r.passed).length,
    failed: results.filter((r) => !r.passed && r.severity === "error").length,
    warnings: results.filter((r) => !r.passed && r.severity === "warning").length,
    results,
  };

  // Print summary
  printSummary(summary);

  // Exit with appropriate code
  process.exit(summary.failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error("❌ Validation script failed:");
  console.error(error);
  process.exit(1);
});
