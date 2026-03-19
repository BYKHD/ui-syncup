#!/usr/bin/env node
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// index.ts
var import_commander = require("commander");

// src/commands/init.ts
var import_node_fs2 = require("fs");
var import_node_child_process2 = require("child_process");
var import_prompts = require("@inquirer/prompts");

// src/lib/ui.ts
var import_chalk = __toESM(require("chalk"));
var ui = {
  info: (msg) => console.log(import_chalk.default.blue("\u2139"), msg),
  success: (msg) => console.log(import_chalk.default.green("\u2714"), msg),
  warn: (msg) => console.log(import_chalk.default.yellow("\u26A0"), msg),
  error: (msg) => console.error(import_chalk.default.red("\u2716"), msg),
  step: (n, total, msg) => console.log(import_chalk.default.dim(`[${n}/${total}]`), msg),
  header: (msg) => console.log("\n" + import_chalk.default.bold.blue(msg) + "\n")
};

// src/lib/env.ts
var import_node_fs = require("fs");
var import_node_crypto = require("crypto");
var REQUIRED_VARS = [
  "DATABASE_URL",
  "DIRECT_URL",
  "REDIS_URL",
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_URL",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_API_URL"
];
var ENV_EXAMPLE_URL = "https://github.com/BYKHD/ui-syncup/blob/main/.env.example";
function parseEnv(filePath) {
  if (!(0, import_node_fs.existsSync)(filePath)) return {};
  const content = (0, import_node_fs.readFileSync)(filePath, "utf-8");
  const vars = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    vars[trimmed.slice(0, idx)] = trimmed.slice(idx + 1);
  }
  return vars;
}
function writeEnv(filePath, vars) {
  const lines = Object.entries(vars).map(([k, v]) => `${k}=${v}`);
  (0, import_node_fs.writeFileSync)(filePath, lines.join("\n") + "\n", { mode: 384 });
}
function generateSecret() {
  return (0, import_node_crypto.randomBytes)(32).toString("hex");
}
function getMissingVars(vars) {
  return REQUIRED_VARS.filter((k) => !vars[k] || vars[k].trim() === "");
}

// src/lib/docker.ts
var import_node_child_process = require("child_process");
function isDockerRunning() {
  try {
    (0, import_node_child_process.execSync)("docker info", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}
function runCompose(composeFile, args, profiles = []) {
  const profileFlags = profiles.flatMap((p) => ["--profile", p]);
  const cmd = ["docker", "compose", "-f", composeFile, ...profileFlags, ...args];
  const result = (0, import_node_child_process.spawnSync)(cmd[0], cmd.slice(1), { stdio: "inherit" });
  return { success: result.status === 0 };
}

// src/commands/init.ts
var COMPOSE_URL = "https://raw.githubusercontent.com/BYKHD/ui-syncup/main/docker/compose.yml";
var ENV_EXAMPLE_URL2 = "https://raw.githubusercontent.com/BYKHD/ui-syncup/main/.env.example";
async function initCommand() {
  ui.header("UI SyncUp \u2014 Setup Wizard");
  ui.step(1, 6, "Checking Docker...");
  if (!isDockerRunning()) {
    ui.error("Docker is not running. Please start Docker and try again.");
    process.exit(1);
  }
  ui.success("Docker is running");
  ui.step(2, 6, "Setting up compose.yml...");
  if ((0, import_node_fs2.existsSync)("compose.yml")) {
    ui.info("compose.yml already exists \u2014 skipping download");
  } else {
    (0, import_node_child_process2.execSync)(`curl -fsSL "${COMPOSE_URL}" -o compose.yml`, { stdio: "inherit" });
    ui.success("Downloaded compose.yml");
  }
  ui.step(3, 6, "Setting up .env...");
  let envVars = {};
  const envExists = (0, import_node_fs2.existsSync)(".env");
  if (envExists) {
    ui.warn(".env already exists \u2014 checking for missing vars only");
    envVars = parseEnv(".env");
  } else {
    (0, import_node_child_process2.execSync)(`curl -fsSL "${ENV_EXAMPLE_URL2}" -o .env`, { stdio: "inherit" });
    envVars = parseEnv(".env");
    ui.success("Downloaded .env template");
  }
  ui.step(4, 6, "Configuring services...");
  const appUrl = await (0, import_prompts.input)({
    message: "Public URL of your app (e.g. https://syncup.example.com):",
    default: envVars["BETTER_AUTH_URL"] || "",
    validate: (v) => v.startsWith("http") || "Must start with http:// or https://"
  });
  envVars["BETTER_AUTH_URL"] = appUrl;
  envVars["NEXT_PUBLIC_APP_URL"] = appUrl;
  envVars["NEXT_PUBLIC_API_URL"] = `${appUrl}/api`;
  if (!envVars["BETTER_AUTH_SECRET"]) {
    const autoSecret = await (0, import_prompts.confirm)({
      message: "Auto-generate a secure BETTER_AUTH_SECRET?",
      default: true
    });
    if (autoSecret) {
      envVars["BETTER_AUTH_SECRET"] = generateSecret();
      ui.success("Generated BETTER_AUTH_SECRET");
    }
  }
  const profiles = [];
  const dbChoice = await (0, import_prompts.select)({
    message: "Database backend:",
    choices: [
      { name: "Bundled PostgreSQL (recommended)", value: "bundled" },
      { name: "External (Supabase / Neon / other)", value: "external" }
    ]
  });
  if (dbChoice === "bundled") {
    profiles.push("db");
    const pgPass = await (0, import_prompts.input)({
      message: "PostgreSQL password (POSTGRES_PASSWORD, min 8 chars):",
      validate: (v) => v.length >= 8 || "Minimum 8 characters"
    });
    envVars["POSTGRES_PASSWORD"] = pgPass;
    envVars["DATABASE_URL"] = `postgresql://syncup:${pgPass}@postgres:5432/ui_syncup`;
    envVars["DIRECT_URL"] = envVars["DATABASE_URL"];
  } else {
    envVars["DATABASE_URL"] = await (0, import_prompts.input)({
      message: "DATABASE_URL (postgresql://...):",
      validate: (v) => v.startsWith("postgres") || "Must be a PostgreSQL URL"
    });
    envVars["DIRECT_URL"] = await (0, import_prompts.input)({
      message: "DIRECT_URL (non-pooled, for migrations):",
      default: envVars["DATABASE_URL"]
    });
  }
  const cacheChoice = await (0, import_prompts.select)({
    message: "Cache backend:",
    choices: [
      { name: "Bundled Redis (recommended)", value: "bundled" },
      { name: "External (Upstash / Redis Cloud)", value: "external" }
    ]
  });
  if (cacheChoice === "bundled") {
    profiles.push("cache");
    envVars["REDIS_URL"] = "redis://redis:6379";
  } else {
    envVars["REDIS_URL"] = await (0, import_prompts.input)({
      message: "REDIS_URL (redis://...):",
      validate: (v) => v.startsWith("redis") || "Must be a Redis URL"
    });
  }
  const storageChoice = await (0, import_prompts.select)({
    message: "Storage backend:",
    choices: [
      { name: "Bundled MinIO (recommended)", value: "bundled" },
      { name: "External S3 (AWS / R2 / Backblaze)", value: "external" }
    ]
  });
  if (storageChoice === "bundled") {
    profiles.push("storage");
    const minioUser = await (0, import_prompts.input)({ message: "MinIO root username:", default: "minioadmin" });
    const minioPass = await (0, import_prompts.input)({
      message: "MinIO root password (min 8 chars):",
      validate: (v) => v.length >= 8 || "Minimum 8 characters"
    });
    envVars["MINIO_ROOT_USER"] = minioUser;
    envVars["MINIO_ROOT_PASSWORD"] = minioPass;
    envVars["STORAGE_ENDPOINT"] = "http://minio:9000";
    envVars["STORAGE_REGION"] = "us-east-1";
    envVars["STORAGE_ACCESS_KEY_ID"] = minioUser;
    envVars["STORAGE_SECRET_ACCESS_KEY"] = minioPass;
    envVars["STORAGE_ATTACHMENTS_BUCKET"] = "ui-syncup-attachments";
    envVars["STORAGE_MEDIA_BUCKET"] = "ui-syncup-media";
    envVars["STORAGE_ATTACHMENTS_PUBLIC_URL"] = `${appUrl}/storage/attachments`;
    envVars["STORAGE_MEDIA_PUBLIC_URL"] = `${appUrl}/storage/media`;
  } else {
    envVars["STORAGE_ENDPOINT"] = await (0, import_prompts.input)({ message: "Storage endpoint URL:" });
    envVars["STORAGE_ACCESS_KEY_ID"] = await (0, import_prompts.input)({ message: "Storage access key ID:" });
    envVars["STORAGE_SECRET_ACCESS_KEY"] = await (0, import_prompts.input)({ message: "Storage secret access key:" });
  }
  const emailChoice = await (0, import_prompts.select)({
    message: "Email provider:",
    choices: [
      { name: "Resend", value: "resend" },
      { name: "SMTP (self-hosted)", value: "smtp" },
      { name: "Skip for now", value: "skip" }
    ]
  });
  if (emailChoice === "resend") {
    envVars["RESEND_API_KEY"] = await (0, import_prompts.input)({ message: "Resend API key:" });
    envVars["RESEND_FROM_EMAIL"] = await (0, import_prompts.input)({ message: "From email address:" });
  } else if (emailChoice === "smtp") {
    envVars["SMTP_HOST"] = await (0, import_prompts.input)({ message: "SMTP host:" });
    envVars["SMTP_PORT"] = await (0, import_prompts.input)({ message: "SMTP port:", default: "587" });
    envVars["SMTP_USER"] = await (0, import_prompts.input)({ message: "SMTP username:" });
    envVars["SMTP_PASSWORD"] = await (0, import_prompts.input)({ message: "SMTP password:" });
    envVars["SMTP_FROM_EMAIL"] = await (0, import_prompts.input)({ message: "From email:" });
    envVars["SMTP_SECURE"] = await (0, import_prompts.input)({ message: "TLS? (true/false):", default: "true" });
  }
  envVars["COMPOSE_PROFILES"] = profiles.join(",");
  ui.step(5, 6, "Writing .env...");
  writeEnv(".env", envVars);
  ui.success(".env written (permissions: 0600)");
  ui.step(6, 6, "Starting UI SyncUp...");
  const result = runCompose("compose.yml", ["up", "-d"], profiles);
  if (!result.success) {
    ui.error("docker compose up failed \u2014 check logs with: docker compose logs app");
    process.exit(1);
  }
  ui.success("UI SyncUp is running!");
  ui.info(`Open: ${appUrl}`);
  if (profiles.length > 0) {
    ui.info(`Active profiles: ${profiles.join(", ")}`);
  }
}

// src/commands/upgrade.ts
async function upgradeCommand(composeFile) {
  ui.header("UI SyncUp \u2014 Upgrade");
  if (!isDockerRunning()) {
    ui.error("Docker is not running.");
    process.exit(1);
  }
  ui.step(1, 2, "Pulling latest image...");
  const pull = runCompose(composeFile, ["pull"]);
  if (!pull.success) {
    ui.error("docker compose pull failed");
    process.exit(1);
  }
  ui.step(2, 2, "Restarting stack (migrations run automatically on container start)...");
  const up = runCompose(composeFile, ["up", "-d", "--remove-orphans"]);
  if (!up.success) {
    ui.error("docker compose up failed \u2014 check logs with: docker compose logs app");
    process.exit(1);
  }
  ui.success("Upgrade complete. Migrations applied automatically via the app entrypoint.");
}

// src/commands/doctor.ts
var import_node_child_process3 = require("child_process");
var import_node_fs3 = require("fs");
async function doctorCommand() {
  ui.header("UI SyncUp \u2014 Doctor");
  let allGood = true;
  ui.info("Checking Docker daemon...");
  if (isDockerRunning()) {
    ui.success("Docker is running");
  } else {
    ui.error("Docker is not running");
    allGood = false;
  }
  ui.info("Checking .env required variables...");
  if (!(0, import_node_fs3.existsSync)(".env")) {
    ui.error(".env not found. Run: npx ui-syncup init");
    allGood = false;
  } else {
    const vars = parseEnv(".env");
    const missing = getMissingVars(vars);
    if (missing.length === 0) {
      ui.success("All required env vars present");
    } else {
      for (const k of missing) {
        ui.error(`Missing: ${k} \u2014 see ${ENV_EXAMPLE_URL}`);
      }
      allGood = false;
    }
  }
  ui.info("Checking /api/health...");
  try {
    const vars = (0, import_node_fs3.existsSync)(".env") ? parseEnv(".env") : {};
    const appUrl = vars["NEXT_PUBLIC_APP_URL"] || "http://localhost:3000";
    const raw = (0, import_node_child_process3.execSync)(`curl -sf "${appUrl}/api/health"`, {
      encoding: "utf-8",
      timeout: 5e3
    });
    const json = JSON.parse(raw);
    if (json.status === "ok") {
      ui.success(`Health OK \u2014 version: ${json.version}`);
    } else {
      ui.warn(`Health returned status: ${json.status}`);
    }
  } catch {
    ui.error("Health endpoint unreachable \u2014 is the stack running?");
    allGood = false;
  }
  ui.info("Checking disk space...");
  try {
    const dfOut = (0, import_node_child_process3.execSync)("df -k . | awk 'NR==2{print $4}'", {
      encoding: "utf-8"
    }).trim();
    const freeGB = parseInt(dfOut, 10) / 1024 / 1024;
    if (freeGB >= 2) {
      ui.success(`Disk space OK \u2014 ${freeGB.toFixed(1)} GB free`);
    } else {
      ui.warn(`Low disk space \u2014 ${freeGB.toFixed(1)} GB free (recommend >= 2 GB)`);
      allGood = false;
    }
  } catch {
    ui.warn("Could not check disk space");
  }
  console.log("");
  if (allGood) {
    ui.success("All checks passed.");
  } else {
    ui.error("Some checks failed \u2014 see above.");
    process.exit(1);
  }
}

// index.ts
var DEFAULT_COMPOSE = "compose.yml";
var program = new import_commander.Command().name("ui-syncup").description("Self-host UI SyncUp with a single command").version("0.2.4");
program.command("init").description("Guided setup: download compose file, configure services, start the stack").action(initCommand);
program.command("upgrade").description("Pull latest image and restart the stack (migrations run automatically)").option("-f, --file <path>", "Path to compose file", DEFAULT_COMPOSE).action(({ file }) => upgradeCommand(file));
program.command("doctor").description("Validate environment, service health, and disk space").action(doctorCommand);
program.parse();
