import { mkdtempSync, rmSync, writeFileSync } from "fs";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";
import { resolveLocalDirectUrl } from "../supabase";

const ORIGINAL_DIRECT_URL = process.env.DIRECT_URL;

function makeTempProjectRoot(): string {
  return mkdtempSync(path.join(os.tmpdir(), "ui-syncup-cli-"));
}

afterEach(() => {
  if (ORIGINAL_DIRECT_URL === undefined) {
    delete process.env.DIRECT_URL;
  } else {
    process.env.DIRECT_URL = ORIGINAL_DIRECT_URL;
  }
});

describe("resolveLocalDirectUrl", () => {
  it("prefers DIRECT_URL from .env.local over process env", () => {
    const projectRoot = makeTempProjectRoot();
    try {
      process.env.DIRECT_URL = "postgresql://prod.example.com/prod";
      writeFileSync(
        path.join(projectRoot, ".env.local"),
        'DIRECT_URL="postgresql://127.0.0.1:54322/postgres"\n',
        "utf-8"
      );

      expect(resolveLocalDirectUrl(projectRoot)).toBe(
        "postgresql://127.0.0.1:54322/postgres"
      );
    } finally {
      rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  it("falls back to process env when .env.local is missing", () => {
    const projectRoot = makeTempProjectRoot();
    try {
      process.env.DIRECT_URL = "postgresql://fallback.example.com/postgres";
      expect(resolveLocalDirectUrl(projectRoot)).toBe(
        "postgresql://fallback.example.com/postgres"
      );
    } finally {
      rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  it("returns null when DIRECT_URL is not configured", () => {
    const projectRoot = makeTempProjectRoot();
    try {
      delete process.env.DIRECT_URL;
      writeFileSync(path.join(projectRoot, ".env.local"), 'DIRECT_URL=""\n', "utf-8");

      expect(resolveLocalDirectUrl(projectRoot)).toBeNull();
    } finally {
      rmSync(projectRoot, { recursive: true, force: true });
    }
  });
});
