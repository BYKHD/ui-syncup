# Implementation Plan

- [x] 1. Extend environment configuration for Microsoft and Atlassian OAuth
  - Add Microsoft OAuth environment variables (MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, MICROSOFT_TENANT_ID)
  - Add Atlassian OAuth environment variables (ATLASSIAN_CLIENT_ID, ATLASSIAN_CLIENT_SECRET)
  - Update environment validation schema in src/lib/env.ts
  - Update .env.example with new OAuth provider variables
  - _Requirements: 5.1, 5.2_

- [x] 1.1 Write unit tests for environment validation
  - Validate environment variable parsing
  - Validate error messages for missing variables

- [x] 2. Update auth configuration to support multiple OAuth providers
  - Extend OAuthProvider interface in src/lib/auth-config.ts to include enabled flag
  - Add Microsoft and Atlassian provider configuration functions
  - Update AuthConfig interface to include all three providers
  - Implement provider enablement logic based on environment variables
  - _Requirements: 5.1, 5.3_

- [x] 2.1 Write unit tests for provider configuration
  - Test provider visibility based on config flags
  - Test default configuration values

- [x] 2.2 Write unit tests for callback URI construction
  - Test URI construction with different providers
  - Test URI construction with various base URLs

- [ ] 3. Configure better-auth with Microsoft and Atlassian providers
  - Update socialProviders configuration in src/lib/auth.ts
  - Add Microsoft provider with tenant support
  - Add Atlassian provider configuration
  - Ensure all providers use proper scopes (openid, email, profile)
  - _Requirements: 1.1, 2.1, 3.1, 7.4_

- [x] 3.1 Write unit tests for OAuth redirect URL construction
  - Test redirect URL parameters (client_id, scope, etc.)
  - Test state parameter inclusion

- [x] 3.2 Write unit tests for minimum scopes
  - Verify required scopes are present for each provider
  - Verify strict scope enforcement

- [x] 4. Create provider configuration API endpoint
  - Create GET /api/auth/providers endpoint
  - Return enabled status for each OAuth provider
  - Implement server-side provider availability check
  - Add proper error handling and validation
  - _Requirements: 5.3_

- [x] 4.1 Write unit tests for provider API endpoint
  - Test enabled/disabled provider responses
  - Test error handling for invalid requests
  - _Requirements: 5.3_

- [ ] 5. Implement social login buttons component
  - Create SocialLoginButtons component in features/auth/components
  - Add provider icons and styling for Google, Microsoft, Atlassian
  - Implement dynamic button visibility based on provider configuration
  - Add loading states and error handling
  - Integrate with better-auth client for OAuth initiation
  - _Requirements: 1.1, 2.1, 3.1, 5.3, 6.1_

- [ ] 5.1 Write unit tests for OAuth flow initiation
  - Test PKCE challenge generation
  - Test state generation and storage

- [ ] 5.2 Write component tests for social login buttons
  - Test button rendering based on provider config
  - Test loading states during OAuth initiation
  - Test error message display
  - _Requirements: 5.3, 6.1, 6.2_

- [ ] 6. Implement OAuth callback handling and user management
  - Extend OAuth callback processing to handle Microsoft and Atlassian
  - Implement user creation from OAuth profile data
  - Add account linking logic for existing users with matching emails
  - Ensure email_verified is set to true for OAuth users
  - Add proper error handling for OAuth failures
  - _Requirements: 1.2, 1.3, 1.4, 1.5, 2.2, 2.3, 2.4, 2.5, 3.2, 3.3, 3.4, 3.5_

- [ ] 6.1 Write integration tests for OAuth profile processing
  - Test user creation from valid OAuth profile
  - Test user update from existing OAuth profile

- [ ] 6.2 Write integration tests for new user email verification
  - Verify email_verified is set to true for new OAuth users
  - Verify email verification status persists

- [ ] 6.3 Write integration tests for account linking
  - Test linking OAuth account to existing user with matching email
  - Test prevention of duplicate account linking

- [ ] 6.4 Write unit tests for state validation
  - Test state parameter verification
  - Test rejection of invalid or tampered state

- [ ] 7. Implement multiple account linking functionality
  - Add account linking API endpoints for authenticated users
  - Implement Provider_Account creation for new linked accounts
  - Add validation to prevent linking accounts already linked to other users
  - Implement multi-account sign-in support
  - Add protection against unlinking the last authentication method
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 7.1 Write integration tests for account linking
  - Verify Provider_Account creation on linking
  - Verify user association

- [ ] 7.2 Write integration tests for multi-account sign-in
  - Test sign-in with primary provider
  - Test sign-in with linked secondary provider

- [ ] 7.3 Write integration tests for last auth method protection
  - Test prevention of unlinking the last provider
  - Test successful unlinking when multiple providers exist

- [ ] 7.4 Write integration tests for account linking edge cases
  - Test duplicate account linking prevention
  - Test error messages for account linking failures
  - _Requirements: 4.2_

- [ ] 8. Implement comprehensive error handling
  - Add OAuth error mapping for user-friendly messages
  - Implement proper error pages and redirects
  - Add error logging for debugging OAuth issues
  - Implement success redirect handling with intended destinations
  - _Requirements: 6.2, 6.3, 6.4_

- [ ] 8.1 Write integration tests for OAuth error handling
  - Test handling of various OAuth error codes
  - Test user redirection on error

- [ ] 8.2 Write unit tests for successful redirect
  - Validates redirect logic and destination
  - Ensure security of redirect URLs

- [ ] 8.3 Write integration tests for specific error scenarios
  - Test consent denied handling
  - Test server error handling
  - Test invalid state handling
  - _Requirements: 6.3_

- [ ] 9. Implement token security measures
  - Add token encryption for stored Provider_Account tokens
  - Verify httpOnly cookie configuration for sessions
  - Implement proper token refresh handling
  - Add token expiration management
  - _Requirements: 7.3, 7.5_

- [ ] 9.1 Write unit tests for token encryption
  - Test encryption and decryption correctness
  - Test handling of different key sizes/types

- [ ] 9.2 Write unit tests for token security
  - Test httpOnly cookie configuration
  - Test token encryption/decryption
  - _Requirements: 7.3, 7.5_

- [ ] 10. Update sign-in and sign-up pages
  - Integrate SocialLoginButtons component into sign-in page
  - Update sign-up page to include social login options
  - Add proper spacing and styling for social login section
  - Ensure consistent user experience across auth pages
  - _Requirements: 1.1, 2.1, 3.1_

- [ ] 10.1 Write integration tests for auth pages
  - Test social login button functionality on sign-in page
  - Test social login button functionality on sign-up page
  - Test page layout and styling
  - _Requirements: 1.1, 2.1, 3.1_

- [ ] 11. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Add account management UI for linked accounts
  - Create linked accounts section in user settings
  - Add UI to view currently linked OAuth providers
  - Implement link/unlink account functionality
  - Add confirmation dialogs for account unlinking
  - Show appropriate warnings when trying to unlink last auth method
  - _Requirements: 4.1, 4.2, 4.4_

- [ ] 12.1 Write integration tests for account management
  - Test linked accounts display
  - Test account linking/unlinking flows
  - Test last auth method protection in UI
  - _Requirements: 4.1, 4.2, 4.4_

- [ ] 13. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Additional Test Tasks (Best Practices Enhancements)

- [ ] 14. Implement rate limiting for OAuth endpoints
  - Add rate limiting middleware for /api/auth/* routes
  - Configure appropriate limits for OAuth initiation and callback
  - _Requirements: Security best practice_

- [ ] 14.1 Write property tests for rate limiting
  - Test that requests are blocked after N failed attempts
  - Test rate limit reset after timeout period
  - _Aligns with: TESTING.md recommendation for security-critical property tests_

- [ ] 15. Implement token refresh rotation
  - Add automatic token refresh before expiration
  - Implement refresh token rotation for enhanced security
  - _Requirements: 7.5 (token security)_

- [ ] 15.1 Write integration tests for token refresh
  - Test automatic refresh before token expiration
  - Test refresh token rotation behavior
  - Test handling of expired refresh tokens

- [ ] 16. Write E2E browser tests for OAuth flows
  - Test complete Google OAuth flow (Playwright)
  - Test complete Microsoft OAuth flow (Playwright)
  - Test complete Atlassian OAuth flow (Playwright)
  - Test error recovery flows
  - _Aligns with: TESTING.md recommendation for E2E testing_

- [ ] 17. Write accessibility tests for social login UI
  - Test keyboard navigation for social login buttons
  - Test screen reader compatibility (ARIA labels)
  - Test focus management during OAuth redirect/return
  - _Aligns with: Best practices for inclusive design_

- [ ] 18. Write property tests for security-critical items
  - **Property test for PKCE**: Verify code_challenge and code_verifier are correctly generated for all inputs
  - **Property test for state validation**: Verify state rejection for any tampered value
  - **Property test for token encryption**: Verify encryption/decryption roundtrip for all token formats
  - _Aligns with: TESTING.md recommendation for security-critical property tests_

- [ ] 19. Write unit tests for Microsoft multi-tenant handling
  - Test single-tenant configuration (specific tenant ID)
  - Test multi-tenant configuration (common endpoint)
  - Test tenant-specific scope requirements
  - _Requirements: 2.1 (Microsoft OAuth support)_