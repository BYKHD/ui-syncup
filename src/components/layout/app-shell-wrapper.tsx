"use client";

import dynamic from "next/dynamic";

interface AppShellWrapperProps {
  variant?: "sidebar" | "blank";
  sidebar?: React.ReactNode;
  header?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const AppShell = dynamic(
  () => import("./app-shell").then(mod => ({ default: mod.AppShell })),
  { ssr: false }
);

/**
 * Client wrapper for AppShell that uses dynamic import with ssr: false.
 * This prevents Radix UI hydration mismatches by only rendering on the client.
 */
export function AppShellWrapper(props: AppShellWrapperProps) {
  return <AppShell {...props} />;
}
