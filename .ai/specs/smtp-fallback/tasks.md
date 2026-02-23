# Implementation Plan: SMTP Fallback

## Overview

Convert the generic SMTP fallback design into discrete, implementable tasks. This involves introducing `nodemailer`, defining an interchangeable transport interface, encapsulating the existing Resend implementation, and adding the environment variable routing logic.

## Tasks

- [x] 1. Dependencies and Environment Configuration
  - [x] 1.1 Install `nodemailer` and its types
    - `nodemailer` v8.0.1 already in `package.json` (ships own TypeScript types)
    - _Requirements: 2.5_
    - _Location: `package.json`_

  - [x] 1.2 Update environment variable schemas
    - Added `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL`, and `SMTP_SECURE` to Zod schema.
    - Group validation rejects partial SMTP configuration when `SMTP_HOST` is present.
    - Production check now accepts SMTP as an alternative to Resend.
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
    - _Location: `src/lib/env.ts`_

  - [x] 1.3 Write property test: Environment Validation
    - **Property 3: Environment Validation** (P3a–P3e, 5 tests, all passing)
    - **Validates: Requirements 2.4**
    - _Location: `src/lib/__tests__/env.property.test.ts`_

  - [x] 1.4 Update CLI initialization and templates
    - Updated `cli/templates/env.local.template` and `cli/templates/env.production.template` with SMTP blocks.
    - Updated `.env.example` with SMTP variables.
    - Updated `cli/templates/docker-compose.override.template.yml` to pass `SMTP_*` to the app container.
    - Updated `getOptionalServiceWarnings` in `cli/commands/init.ts` to check `SMTP_HOST`.
    - _Requirements: 2.6, 2.7, 2.8_
    - _Location: `cli/commands/init.ts`, `cli/templates/`, `.env.example`_

- [x] 2. Transport Provider Implementations
  - [x] 2.1 Define EmailProvider interface
    - Create the standard interface representing common dispatch operations.
    - _Requirements: 3.1_
    - _Location: `src/server/email/providers/index.ts`_

  - [x] 2.2 Implement ConsoleProvider
    - Extract the existing `logEmailToConsole` fallback logic into a formal class implementing `EmailProvider`.
    - _Requirements: 1.4_
    - _Location: `src/server/email/providers/console-provider.ts`_

  - [x] 2.3 Implement ResendProvider
    - Encapsulate the current Resend API SDK logic into a class implementing `EmailProvider`.
    - _Requirements: 1.1, 3.1, 3.2, 3.3_
    - _Location: `src/server/email/providers/resend-provider.ts`_

  - [x] 2.4 Implement SmtpProvider
    - Create a class using `nodemailer` that implements `EmailProvider`.
    - Map the generic `EmailJob` fields to Nodemailer options.
    - Configure TLS settings based on `SMTP_SECURE` and `SMTP_PORT`.
    - _Requirements: 2.5, 3.1, 3.2, 3.3, NFR (Security)_
    - _Location: `src/server/email/providers/smtp-provider.ts`_

- [x] 3. Client Routing and Refactoring
  - [x] 3.1 Refactor core client router
    - Update `sendEmail` to resolve the provider dynamically via a `resolveProvider()` factory.
    - Prioritize Resend over SMTP, and handle development/production fallback states.
    - Updated `isEmailConfigured()` in `src/lib/resend.ts` to check both Resend and SMTP.
    - Updated barrel `src/server/email/index.ts` (replaced `resend` export with `resolveProvider`).
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
    - _Location: `src/server/email/client.ts`_

  - [x] 3.2 Write property test: Provider Selection Determinism
    - **Property 1: Provider Selection Determinism** (P1a–P1e, 5 tests, all passing)
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**
    - _Location: `src/server/email/__tests__/client.property.test.ts`_

  - [x] 3.3 Write property test: Payload Parity
    - **Property 2: Payload Parity** (P2a–P2d, 4 tests, all passing)
    - **Validates: Requirements 3.1**
    - _Location: `src/server/email/__tests__/payload.property.test.ts`_

- [x] 4. Verification Checkpoint
  - [x] 4.1 Checkpoint - Ensure all tests pass
    - **All 14 SMTP-fallback property tests pass** (3 test files, 14 assertions):
      - Property 1: Provider Selection Determinism (P1a–P1e, 5/5 ✅)
      - Property 2: Payload Parity (P2a–P2d, 4/4 ✅)
      - Property 3: Environment Validation (P3a–P3e, 5/5 ✅)
    - **TypeScript typecheck passes** (`tsc --noEmit` — zero errors)
    - **Full suite: 91/93 files pass, 873/876 tests pass** (6 skipped)
    - 3 pre-existing failures in `resource-limits.property.test.ts` and `team-creation-flow.integration.test.ts` (team member quota — unrelated to SMTP fallback)
    - _Verified: 2026-02-23_
