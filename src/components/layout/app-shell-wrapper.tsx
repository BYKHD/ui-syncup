"use client";

import dynamic from "next/dynamic";
import { AppShellSkeleton } from "./app-shell-skeleton";

interface AppShellWrapperProps {
  variant?: "sidebar" | "blank";
  sidebar?: React.ReactNode;
  header?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const AppShell = dynamic(
  () => import("./app-shell").then(mod => ({ default: mod.AppShell })),
  { 
    ssr: false,
    loading: () => <AppShellSkeleton />
  }
);

/**
 * Client wrapper for AppShell that uses dynamic import with ssr: false.
 * This prevents Radix UI hydration mismatches by only rendering on the client.
 * 
 * The AppShellSkeleton loading fallback eliminates the flash of white content
 * during initial client-side hydration.
 */
export function AppShellWrapper(props: AppShellWrapperProps) {
  return <AppShell {...props} />;
}

