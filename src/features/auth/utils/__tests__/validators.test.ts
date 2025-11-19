import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  passwordSchema,
  signUpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "../validators";

/**
 * Property-Based Tests for Authentication Validation
 * 
 * These tests use fast-check to generate random inputs and verify
 * that validation behaves correctly across all possible inputs.
 */

describe("Password Validation - Property-Based Tests", () => {
  /**
   * Feature: authentication-system, Property 2: Password validation enforces security requirements
   * Validates: Requirements 1.3
   * 
   * For any password string, validation should reject passwords that don't meet requirements
   * (8+ chars, uppercase, lowercase, number, special char) and accept passwords that do.
   */
  it("Property 2: Password validation enforces security requirements", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 8, maxLength: 50 }),
        (basePassword) => {
          // Test 1: Password without uppercase should fail
          const noUppercase = basePassword.toLowerCase().replace(/[A-Z]/g, "a");
          if (!/[A-Z]/.test(noUppercase) && /[a-z]/.test(noUppercase) && /[0-9]/.test(noUppercase) && /[^A-Za-z0-9]/.test(noUppercase)) {
            const result = passwordSchema.safeParse(noUppercase);
            expect(result.success).toBe(false);
            if (!result.success) {
              expect(result.error.issues.some(issue => 
                issue.message.includes("uppercase")
              )).toBe(true);
            }
          }

          // Test 2: Password without lowercase should fail
          const noLowercase = basePassword.toUpperCase().replace(/[a-z]/g, "A");
          if (!/[a-z]/.test(noLowercase) && /[A-Z]/.test(noLowercase) && /[0-9]/.test(noLowercase) && /[^A-Za-z0-9]/.test(noLowercase)) {
            const result = passwordSchema.safeParse(noLowercase);
            expect(result.success).toBe(false);
            if (!result.success) {
              expect(result.error.issues.some(issue => 
                issue.message.includes("lowercase")
              )).toBe(true);
            }
          }

          // Test 3: Password without number should fail
          const noNumber = basePassword.replace(/[0-9]/g, "");
          if (!/[0-9]/.test(noNumber) && /[A-Z]/.test(noNumber) && /[a-z]/.test(noNumber) && /[^A-Za-z0-9]/.test(noNumber) && noNumber.length >= 8) {
            const result = passwordSchema.safeParse(noNumber);
            expect(result.success).toBe(false);
            if (!result.success) {
              expect(result.error.issues.some(issue => 
                issue.message.includes("number")
              )).toBe(true);
            }
          }

          // Test 4: Password without special character should fail
          const noSpecial = basePassword.replace(/[^A-Za-z0-9]/g, "");
          if (!/[^A-Za-z0-9]/.test(noSpecial) && /[A-Z]/.test(noSpecial) && /[a-z]/.test(noSpecial) && /[0-9]/.test(noSpecial) && noSpecial.length >= 8) {
            const result = passwordSchema.safeParse(noSpecial);
            expect(result.success).toBe(false);
            if (!result.success) {
              expect(result.error.issues.some(issue => 
                issue.message.includes("special")
              )).toBe(true);
            }
          }

          // Test 5: Password too short should fail
          const tooShort = "Aa1!";
          const result = passwordSchema.safeParse(tooShort);
          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.issues.some(issue => 
              issue.message.includes("at least 8")
            )).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Property 2 (positive): Valid passwords pass validation", () => {
    fc.assert(
      fc.property(
        // Generate valid passwords: 8-50 chars with all required character types
        fc.tuple(
          fc.string({ minLength: 1, maxLength: 5 }).filter(s => /[A-Z]/.test(s)), // uppercase
          fc.string({ minLength: 1, maxLength: 5 }).filter(s => /[a-z]/.test(s)), // lowercase
          fc.string({ minLength: 1, maxLength: 5 }).filter(s => /[0-9]/.test(s)), // numbers
          fc.constantFrom("!", "@", "#", "$", "%", "^", "&", "*", "(", ")", "-", "_", "+", "="), // special char
          fc.string({ minLength: 0, maxLength: 38 }) // filler to reach min length
        ).map(([upper, lower, num, special, filler]) => {
          // Combine all parts and ensure we have at least 8 characters
          const combined = upper + lower + num + special + filler;
          // Shuffle the string
          const parts = combined.split("");
          for (let i = parts.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [parts[i], parts[j]] = [parts[j], parts[i]];
          }
          const shuffled = parts.join("");
          // Ensure minimum length of 8
          return shuffled.length >= 8 ? shuffled.slice(0, 50) : shuffled + "Aa1!";
        }),
        (validPassword) => {
          const result = passwordSchema.safeParse(validPassword);
          if (!result.success) {
            console.log("Failed password:", validPassword);
            console.log("Errors:", result.error.issues);
          }
          expect(result.success).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe("Sign-Up Validation - Property-Based Tests", () => {
  /**
   * Feature: authentication-system, Property 4: Validation errors are field-specific
   * Validates: Requirements 1.5
   * 
   * For any registration data with invalid fields, the error response should contain
   * specific error messages for each invalid field.
   */
  it("Property 4: Validation errors are field-specific", () => {
    fc.assert(
      fc.property(
        fc.record({
          name: fc.oneof(
            fc.constant(""), // empty name
            fc.string({ minLength: 121, maxLength: 200 }) // too long
          ),
          email: fc.oneof(
            fc.constant(""), // empty email
            fc.string().filter(s => !s.includes("@")), // invalid email
            fc.constant("not-an-email")
          ),
          password: fc.oneof(
            fc.constant(""), // empty password
            fc.constant("short"), // too short
            fc.constant("nouppercase1!"), // no uppercase
            fc.constant("NOLOWERCASE1!"), // no lowercase
            fc.constant("NoNumbers!"), // no numbers
            fc.constant("NoSpecial1") // no special
          ),
          confirmPassword: fc.string(),
        }),
        (invalidData) => {
          const result = signUpSchema.safeParse(invalidData);
          
          // Should fail validation
          expect(result.success).toBe(false);
          
          if (!result.success) {
            const errors = result.error.issues;
            
            // Each invalid field should have a specific error
            const errorPaths = errors.map(e => e.path.join("."));
            
            // If name is invalid, should have name error
            if (invalidData.name === "" || invalidData.name.length > 120) {
              expect(errorPaths.some(path => path === "name")).toBe(true);
            }
            
            // If email is invalid, should have email error
            if (invalidData.email === "" || !invalidData.email.includes("@")) {
              expect(errorPaths.some(path => path === "email")).toBe(true);
            }
            
            // If password is invalid, should have password error
            if (invalidData.password.length < 8 || 
                !/[A-Z]/.test(invalidData.password) ||
                !/[a-z]/.test(invalidData.password) ||
                !/[0-9]/.test(invalidData.password) ||
                !/[^A-Za-z0-9]/.test(invalidData.password)) {
              expect(errorPaths.some(path => path === "password")).toBe(true);
            }
            
            // If passwords don't match, should have confirmPassword error
            if (invalidData.password !== invalidData.confirmPassword) {
              expect(errorPaths.some(path => path === "confirmPassword")).toBe(true);
            }
            
            // Each error should have a message
            errors.forEach(error => {
              expect(error.message).toBeTruthy();
              expect(typeof error.message).toBe("string");
              expect(error.message.length).toBeGreaterThan(0);
            });
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe("Zod Schema Validation - Property-Based Tests", () => {
  /**
   * Feature: authentication-system, Property 25: Auth endpoints validate input with Zod
   * Validates: Requirements 8.3
   * 
   * For any authentication endpoint request with invalid data, the response should
   * contain Zod validation errors.
   */
  it("Property 25: Auth endpoints validate input with Zod - Sign Up", () => {
    fc.assert(
      fc.property(
        fc.record({
          name: fc.anything(),
          email: fc.anything(),
          password: fc.anything(),
          confirmPassword: fc.anything(),
        }),
        (data) => {
          const result = signUpSchema.safeParse(data);
          
          // If validation fails, should have Zod error structure
          if (!result.success) {
            expect(result.error).toBeDefined();
            expect(result.error.issues).toBeDefined();
            expect(Array.isArray(result.error.issues)).toBe(true);
            
            // Each issue should have required Zod error properties
            result.error.issues.forEach(issue => {
              expect(issue).toHaveProperty("code");
              expect(issue).toHaveProperty("path");
              expect(issue).toHaveProperty("message");
              expect(Array.isArray(issue.path)).toBe(true);
            });
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Property 25: Auth endpoints validate input with Zod - Forgot Password", () => {
    fc.assert(
      fc.property(
        fc.record({
          email: fc.anything(),
        }),
        (data) => {
          const result = forgotPasswordSchema.safeParse(data);
          
          if (!result.success) {
            expect(result.error).toBeDefined();
            expect(result.error.issues).toBeDefined();
            expect(Array.isArray(result.error.issues)).toBe(true);
            
            result.error.issues.forEach(issue => {
              expect(issue).toHaveProperty("code");
              expect(issue).toHaveProperty("path");
              expect(issue).toHaveProperty("message");
            });
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Property 25: Auth endpoints validate input with Zod - Reset Password", () => {
    fc.assert(
      fc.property(
        fc.record({
          token: fc.anything(),
          password: fc.anything(),
          confirmPassword: fc.anything(),
        }),
        (data) => {
          const result = resetPasswordSchema.safeParse(data);
          
          if (!result.success) {
            expect(result.error).toBeDefined();
            expect(result.error.issues).toBeDefined();
            expect(Array.isArray(result.error.issues)).toBe(true);
            
            result.error.issues.forEach(issue => {
              expect(issue).toHaveProperty("code");
              expect(issue).toHaveProperty("path");
              expect(issue).toHaveProperty("message");
            });
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Property 25: Auth endpoints validate input with Zod - Verify Email", () => {
    fc.assert(
      fc.property(
        fc.record({
          token: fc.anything(),
        }),
        (data) => {
          const result = verifyEmailSchema.safeParse(data);
          
          if (!result.success) {
            expect(result.error).toBeDefined();
            expect(result.error.issues).toBeDefined();
            expect(Array.isArray(result.error.issues)).toBe(true);
            
            result.error.issues.forEach(issue => {
              expect(issue).toHaveProperty("code");
              expect(issue).toHaveProperty("path");
              expect(issue).toHaveProperty("message");
            });
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
