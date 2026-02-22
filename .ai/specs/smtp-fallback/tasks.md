# Implementation Plan: SMTP Fallback

## Overview

Convert the generic SMTP fallback design into discrete, implementable tasks. This involves introducing `nodemailer`, defining an interchangeable transport interface, encapsulating the existing Resend implementation, and adding the environment variable routing logic.

## Tasks

- [ ] 1. Dependencies and Environment Configuration
  - [ ] 1.1 Install `nodemailer` and its types
    - Run `bun add nodemailer` and `bun add -d @types/nodemailer`
    - _Requirements: 2.5_
    - _Location: `package.json`_

  - [ ] 1.2 Update environment variable schemas
    - Add `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL`, and `SMTP_SECURE` to Zod schema.
    - Validate these variables properly (e.g., matching URL/email structures where appropriate).
    - Explicitly coerce `SMTP_PORT` to a number using `z.coerce.number()`.
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
    - _Location: `src/lib/env.ts`_

  - [ ]* 1.3 Write property test: Environment Validation
    - **Property 3: Environment Validation**
    - **Validates: Requirements 2.4**
    - _Location: `src/lib/__tests__/env.property.test.ts`_

  - [ ] 1.4 Update CLI initialization and templates
    - Update `cli/templates/env.local.template`, `cli/templates/env.production.template`, and the root `.env.example` with SMTP variables.
    - Update `cli/templates/docker-compose.override.template.yml` (and other compose files if needed) to explicitly pass `SMTP_*` variables to the application container via the `environment:` block.
    - Update `getOptionalServiceWarnings` in `cli/commands/init.ts` to check `SMTP_HOST` before warning about missing email configuration.
    - _Requirements: 2.6, 2.7, 2.8_
    - _Location: `cli/commands/init.ts`, `cli/templates/`, `.env.example`_

- [ ] 2. Transport Provider Implementations
  - [ ] 2.1 Define EmailProvider interface
    - Create the standard interface representing common dispatch operations.
    - _Requirements: 3.1_
    - _Location: `src/server/email/providers/index.ts`_

  - [ ] 2.2 Implement ConsoleProvider
    - Extract the existing `logEmailToConsole` fallback logic into a formal class implementing `EmailProvider`.
    - _Requirements: 1.4_
    - _Location: `src/server/email/providers/console-provider.ts`_

  - [ ] 2.3 Implement ResendProvider
    - Encapsulate the current Resend API SDK logic into a class implementing `EmailProvider`.
    - _Requirements: 1.1, 3.1, 3.2, 3.3_
    - _Location: `src/server/email/providers/resend-provider.ts`_

  - [ ] 2.4 Implement SmtpProvider
    - Create a class using `nodemailer` that implements `EmailProvider`.
    - Map the generic `EmailJob` fields to Nodemailer options.
    - Configure TLS settings based on `SMTP_SECURE` and `SMTP_PORT`.
    - _Requirements: 2.5, 3.1, 3.2, 3.3, NFR (Security)_
    - _Location: `src/server/email/providers/smtp-provider.ts`_

- [ ] 3. Client Routing and Refactoring
  - [ ] 3.1 Refactor core client router
    - Update `sendEmail` to resolve the provider dynamically via a `resolveProvider()` factory.
    - Prioritize Resend over SMTP, and handle development/production fallback states.
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
    - _Location: `src/server/email/client.ts`_

  - [ ]* 3.2 Write property test: Provider Selection Determinism
    - **Property 1: Provider Selection Determinism**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**
    - _Location: `src/server/email/__tests__/client.property.test.ts`_

  - [ ]* 3.3 Write property test: Payload Parity
    - **Property 2: Payload Parity**
    - **Validates: Requirements 3.1**
    - _Location: `src/server/email/__tests__/payload.property.test.ts`_

- [ ] 4. Verification Checkpoint
  - [ ] 4.1 Checkpoint - Ensure all tests pass
    - Ensure all tests pass, ask the user if questions arise.
