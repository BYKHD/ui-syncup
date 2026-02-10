/**
 * Unit tests for config environment detection.
 *
 * Validates production detection from env files, including nested working dirs.
 *
 * @vitest-environment node
 * @module cli/lib/__tests__/config.test
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { tmpdir } from "os";

import { isProductionEnvironment } from "../config";

const ENV_KEYS = ["UI_SYNCUP_PRODUCTION", "NODE_ENV", "VERCEL_ENV", "DATABASE_URL"] as const;
const ORIGINAL_CWD = process.cwd();
const TEMP_DIRS: string[] = [];

function createProject(files: Record<string, string> = {}): string {
  const projectRoot = mkdtempSync(join(tmpdir(), "ui-syncup-config-"));
  TEMP_DIRS.push(projectRoot);

  writeFileSync(
    join(projectRoot, "package.json"),
    JSON.stringify({ name: "ui-syncup" }),
    "utf-8"
  );

  for (const [relativePath, content] of Object.entries(files)) {
    const filePath = join(projectRoot, relativePath);
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, content, "utf-8");
  }

  return projectRoot;
}

describe("isProductionEnvironment", () => {
  beforeEach(() => {
    for (const key of ENV_KEYS) {
      delete process.env[key];
    }
  });

  afterEach(() => {
    process.chdir(ORIGINAL_CWD);
    for (const key of ENV_KEYS) {
      delete process.env[key];
    }

    while (TEMP_DIRS.length > 0) {
      const dir = TEMP_DIRS.pop();
      if (dir) {
        rmSync(dir, { recursive: true, force: true });
      }
    }
  });

  it("detects production marker from project root env file while running in nested directory", () => {
    const projectRoot = createProject({
      ".env.production": "UI_SYNCUP_PRODUCTION=true\n",
    });
    const nestedDir = join(projectRoot, "nested", "deep");
    mkdirSync(nestedDir, { recursive: true });
    process.chdir(nestedDir);

    expect(isProductionEnvironment()).toBe(true);
  });

  it("does not flag local-only project env config as production", () => {
    const projectRoot = createProject({
      ".env.local": "NODE_ENV=development\nDATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres\n",
    });
    process.chdir(projectRoot);

    expect(isProductionEnvironment()).toBe(false);
  });

  it("supports explicit project root override for production URL detection", () => {
    const projectRoot = createProject({
      ".env.production":
        "DATABASE_URL=postgresql://postgres.xxxxxxxxxxxx:pw@db.abcdefg.supabase.co:5432/postgres\n",
    });
    process.chdir(tmpdir());

    expect(isProductionEnvironment(projectRoot)).toBe(true);
  });
});
