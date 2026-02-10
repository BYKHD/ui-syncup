import { afterEach, describe, expect, it } from "vitest";
import { isNonInteractive } from "../prompts";

const ORIGINAL_CI = process.env.CI;
const STDIN_TTY_DESCRIPTOR = Object.getOwnPropertyDescriptor(process.stdin, "isTTY");
const STDOUT_TTY_DESCRIPTOR = Object.getOwnPropertyDescriptor(process.stdout, "isTTY");

function setTTY(stdinTTY: boolean, stdoutTTY: boolean): void {
  Object.defineProperty(process.stdin, "isTTY", {
    configurable: true,
    value: stdinTTY,
  });
  Object.defineProperty(process.stdout, "isTTY", {
    configurable: true,
    value: stdoutTTY,
  });
}

afterEach(() => {
  if (ORIGINAL_CI === undefined) {
    delete process.env.CI;
  } else {
    process.env.CI = ORIGINAL_CI;
  }

  if (STDIN_TTY_DESCRIPTOR) {
    Object.defineProperty(process.stdin, "isTTY", STDIN_TTY_DESCRIPTOR);
  }
  if (STDOUT_TTY_DESCRIPTOR) {
    Object.defineProperty(process.stdout, "isTTY", STDOUT_TTY_DESCRIPTOR);
  }
});

describe("isNonInteractive", () => {
  it("returns true in CI", () => {
    process.env.CI = "1";
    setTTY(true, true);

    expect(isNonInteractive()).toBe(true);
  });

  it("returns true when stdin is not a TTY", () => {
    delete process.env.CI;
    setTTY(false, true);

    expect(isNonInteractive()).toBe(true);
  });

  it("returns true when stdout is not a TTY", () => {
    delete process.env.CI;
    setTTY(true, false);

    expect(isNonInteractive()).toBe(true);
  });

  it("returns false when running interactively", () => {
    delete process.env.CI;
    setTTY(true, true);

    expect(isNonInteractive()).toBe(false);
  });
});
