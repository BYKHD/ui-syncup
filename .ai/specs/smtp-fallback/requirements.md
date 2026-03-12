# Requirements Document: SMTP Fallback

## Introduction

This feature introduces a generic SMTP fallback for the UI SyncUp email client. Currently, the system strictly relies on the Resend API SDK for sending transactional emails, which creates a hard dependency on a specific SaaS provider. By supporting standard SMTP, self-hosting users can bring their own mail servers (e.g., Mailcow, Mailpit, Postfix), significantly improving the platform's self-hostability and deployment flexibility without sacrificing enterprise features for cloud users.

## Glossary

- **System**: The UI SyncUp application
- **User**: An authenticated person using the system
- **Email_Client**: The internal module responsible for routing and dispatching emails
- **SMTP_Provider**: A generic SMTP server transport used for delivering emails
- **Resend_Provider**: The Resend API service transport
- **Environment**: The runtime environment (development, preview, production)

## Requirements

### Requirement 1: Email Provider Selection

**User Story:** As a system administrator, I want to configure either Resend or a generic SMTP server, so that I can choose the email delivery mechanism that best fits my hosting environment.

#### Acceptance Criteria

1. WHEN the `RESEND_API_KEY` is configured THEN the System SHALL use the **Resend_Provider** for email delivery
2. WHEN the `RESEND_API_KEY` is absent AND the `SMTP_HOST` is configured THEN the System SHALL use the **SMTP_Provider** for email delivery
3. THE System SHALL prioritize the **Resend_Provider** if both configurations are present
4. IF neither provider is configured AND the **Environment** is development THEN the System SHALL log email payloads to the console
5. IF neither provider is configured AND the **Environment** is production THEN the System SHALL log an error and throw a configuration exception

---

### Requirement 2: SMTP Configuration

**User Story:** As a system administrator, I want to provide standard SMTP connection details, so that the system can securely connect to my custom mail server.

#### Acceptance Criteria

1. THE System SHALL accept `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, and `SMTP_PASSWORD` as environment variables
2. THE System SHALL accept `SMTP_FROM_EMAIL` as the default sender address for the **SMTP_Provider**
3. THE System SHALL accept an optional `SMTP_SECURE` boolean to enforce TLS connections
4. WHEN the environment variables are loaded, THEN the System SHALL validate the SMTP configuration variables using Zod schemas
5. THE **Email_Client** SHALL authenticate with the **SMTP_Provider** using the provided credentials
6. WHEN the `ui-syncup init` command generates `.env` files, THE CLI SHALL include SMTP configuration placeholders in the generated files and the static `.env.example` template
7. WHEN the `ui-syncup init` command checks optional services, THE CLI SHALL evaluate both Resend and SMTP configurations to determine if the email service warning should be displayed
8. THE System SHALL expose SMTP configuration variables to the application container via Docker Compose templates

---

### Requirement 3: Email Delivery Parity

**User Story:** As a user, I want to receive system emails reliably, so that I can complete security workflows like password resets regardless of the underlying provider.

#### Acceptance Criteria

1. THE **Email_Client** SHALL dispatch emails with identical HTML content and subject lines across all providers
2. WHEN an email sending attempt completely fails, THEN the **Email_Client** SHALL throw an explicit error detailing the failure reason
3. THE **Email_Client** SHALL log the success or failure of every email delivery attempt with consistent metadata (Job ID, User ID, Type)

---

## Non-Functional Requirements

### Performance

- THE System SHALL initialize the **SMTP_Provider** connection pool optimally to avoid high latency on cold starts
- THE System SHALL respond to email dispatch requests within 2 seconds under normal network conditions

### Security

- THE System SHALL NOT log sensitive connection credentials (e.g., `SMTP_PASSWORD`) during environment validation or error reporting
- THE System SHALL enforce secure connections (TLS/SSL) by default when connecting to remote SMTP servers on port 465

---

## EARS Pattern Reference

Use these patterns for acceptance criteria:

| Pattern | Template | Example |
|---------|----------|---------|
| **Ubiquitous** | `THE [system] SHALL [action]` | THE System SHALL validate email format |
| **Event-Driven** | `WHEN [trigger] THEN the [system] SHALL [action]` | WHEN user clicks submit THEN the System SHALL save the form |
| **State-Driven** | `WHILE [state] the [system] SHALL [action]` | WHILE loading data the System SHALL display a spinner |
| **Unwanted** | `IF [condition] THEN the [system] SHALL [action]` | IF network fails THEN the System SHALL show error message |
| **Optional** | `WHERE [feature] the [system] SHALL [action]` | WHERE dark mode is enabled the System SHALL use dark theme |
| **Complex** | `[WHERE] [WHILE] [WHEN/IF] the [system] SHALL [action]` | WHERE notifications enabled WHEN new message arrives THEN the System SHALL show notification |

---

## INCOSE Quality Checklist

Before finalizing, verify each requirement is:

- [x] **Necessary** - Directly linked to stakeholder needs
- [x] **Unambiguous** - Single interpretation, no vague terms
- [x] **Verifiable** - Can be tested/measured
- [x] **Singular** - One capability per requirement
- [x] **Complete** - Fully describes the need
- [x] **Consistent** - No conflicts with other requirements
- [x] **Feasible** - Technically achievable

---

## Change Log

| Date | Change | Impact | Affected Requirements |
|------|--------|--------|----------------------|
| 2026-02-23 | Added explicit requirements for `.env.example` updates and Docker Compose variable propagation | Low | 2.6, 2.8 |
| YYYY-MM-DD | Initial draft | High | All |
