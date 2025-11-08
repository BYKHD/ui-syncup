/**
 * Password strength validation utilities
 * Used for real-time password strength feedback in forms
 */

export type PasswordStrength = 0 | 1 | 2 | 3 | 4;

export type PasswordRequirements = {
  minLength: boolean;
  hasLowercase: boolean;
  hasUppercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
};

export type PasswordStrengthResult = {
  score: PasswordStrength;
  requirements: PasswordRequirements;
  feedback: string[];
};

const SPECIAL_CHARS = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/;
const MIN_LENGTH = 8;

/**
 * Calculate password strength score (0-4)
 */
export function calculatePasswordStrength(password: string): PasswordStrength {
  if (!password) return 0;

  let score = 0;
  const requirements = getPasswordRequirements(password);

  // Base score for minimum length
  if (requirements.minLength) score++;

  // Additional points for character variety
  if (requirements.hasLowercase) score++;
  if (requirements.hasUppercase) score++;
  if (requirements.hasNumber) score++;
  if (requirements.hasSpecialChar) score++;

  // Cap at 4 but require minimum length first
  return (requirements.minLength ? Math.min(score, 4) : 0) as PasswordStrength;
}

/**
 * Check individual password requirements
 */
export function getPasswordRequirements(password: string): PasswordRequirements {
  return {
    minLength: password.length >= MIN_LENGTH,
    hasLowercase: /[a-z]/.test(password),
    hasUppercase: /[A-Z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecialChar: SPECIAL_CHARS.test(password),
  };
}

/**
 * Get actionable feedback for improving password strength
 */
export function getPasswordFeedback(
  password: string,
  requirements: PasswordRequirements,
): string[] {
  const feedback: string[] = [];

  if (!requirements.minLength) {
    feedback.push(`Use at least ${MIN_LENGTH} characters`);
  }

  if (password.length >= MIN_LENGTH) {
    if (!requirements.hasUppercase) {
      feedback.push("Add uppercase letters");
    }
    if (!requirements.hasNumber) {
      feedback.push("Add numbers");
    }
    if (!requirements.hasSpecialChar) {
      feedback.push("Add special characters (!@#$%^&*)");
    }
  }

  return feedback;
}

/**
 * Validate full password strength with detailed results
 */
export function validatePasswordStrength(password: string): PasswordStrengthResult {
  const requirements = getPasswordRequirements(password);
  const score = calculatePasswordStrength(password);
  const feedback = getPasswordFeedback(password, requirements);

  return {
    score,
    requirements,
    feedback,
  };
}

/**
 * Get human-readable strength description
 */
export function getPasswordStrengthLabel(score: PasswordStrength): string {
  const labels: Record<PasswordStrength, string> = {
    0: "Too weak",
    1: "Weak",
    2: "Fair",
    3: "Good",
    4: "Strong",
  };
  return labels[score];
}

/**
 * Get color class for strength indicator
 */
export function getPasswordStrengthColor(score: PasswordStrength): string {
  const colors: Record<PasswordStrength, string> = {
    0: "text-destructive",
    1: "text-destructive",
    2: "text-yellow-600",
    3: "text-blue-600",
    4: "text-green-600",
  };
  return colors[score];
}
