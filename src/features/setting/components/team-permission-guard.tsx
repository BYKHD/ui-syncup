"use client";

import * as React from "react";

/**
 * Team Permission Guard Component (Mockup)
 * For UI mockup purposes - always allows access
 * TODO: Implement real team permission checking when backend is ready
 */

interface TeamPermissionGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  permission?: string; // Simplified for mockup
  teamId?: string;
}

export function TeamPermissionGuard({
  children,
}: TeamPermissionGuardProps) {
  // For mockup: always grant permission
  return <>{children}</>;
}