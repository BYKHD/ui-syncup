"use client";

import { useMemo } from "react";

import { Progress } from "@/components/ui/progress";

import {
  getPasswordStrengthColor,
  getPasswordStrengthLabel,
  validatePasswordStrength,
} from "../utils/password-strength";

type PasswordStrengthIndicatorProps = {
  password: string;
  className?: string;
  showFeedback?: boolean;
};

export function PasswordStrengthIndicator({
  password,
  className = "",
  showFeedback = true,
}: PasswordStrengthIndicatorProps) {
  const strengthResult = useMemo(() => {
    if (!password) return null;
    return validatePasswordStrength(password);
  }, [password]);

  if (!password || !strengthResult) {
    return null;
  }

  const strengthLabel = getPasswordStrengthLabel(strengthResult.score);
  const strengthColor = getPasswordStrengthColor(strengthResult.score);
  const progressValue = (strengthResult.score / 4) * 100;

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Strength bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Password strength:</span>
          <span className={`font-medium ${strengthColor}`}>
            {strengthLabel}
          </span>
        </div>
        <Progress
          value={progressValue}
          className="h-2"
          aria-label={`Password strength: ${strengthLabel}`}
        />
      </div>

      {/* Feedback messages */}
      {showFeedback && strengthResult.feedback.length > 0 && (
        <div className="space-y-1">
          {strengthResult.feedback.map((feedback, index) => (
            <p
              key={index}
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              <span className="text-yellow-500">⚠</span>
              {feedback}
            </p>
          ))}
        </div>
      )}

      {/* Requirements checklist */}
      {showFeedback && (
        <div className="space-y-1">
          <div className="text-sm text-muted-foreground">Requirements:</div>
          <div className="space-y-1 text-sm">
            <div
              className={`flex items-center gap-2 ${
                strengthResult.requirements.minLength
                  ? "text-green-600"
                  : "text-muted-foreground"
              }`}
            >
              <span>{strengthResult.requirements.minLength ? "✓" : "○"}</span>
              At least 8 characters
            </div>
            {strengthResult.requirements.hasLowercase && (
              <div className="flex items-center gap-2 text-green-600">
                <span>✓</span>
                Contains lowercase letter
              </div>
            )}
            {strengthResult.requirements.hasUppercase && (
              <div className="flex items-center gap-2 text-green-600">
                <span>✓</span>
                Contains uppercase letter
              </div>
            )}
            {strengthResult.requirements.hasNumber && (
              <div className="flex items-center gap-2 text-green-600">
                <span>✓</span>
                Contains number
              </div>
            )}
            {strengthResult.requirements.hasSpecialChar && (
              <div className="flex items-center gap-2 text-green-600">
                <span>✓</span>
                Contains special character
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
