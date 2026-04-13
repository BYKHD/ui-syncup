"use client";

import { UserSettingsAside } from "@/components/shared/settings-sidebar";
import { USER_SETTINGS_NAV } from "@/config/user-settings-nav";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RiInformationLine } from "@remixicon/react";

interface UserSettingsScreenProps {
  children: React.ReactNode;
}

export default function UserSettingsScreen({
  children,
}: UserSettingsScreenProps) {
  return (
    <div className="container mx-auto max-w-6xl px-6 py-8">
      <div className="flex flex-col gap-8 lg:flex-row">
        <UserSettingsAside items={USER_SETTINGS_NAV} />
        <main className="flex-1 max-w-2xl">
          <Alert className="mb-6 bg-blue-50/50 text-blue-800 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900 border">
            <RiInformationLine className="h-4 w-4" />
            <AlertTitle>Mockup Preview</AlertTitle>
            <AlertDescription>
              These settings pages are currently a visual mockup. Layout and interactions are for demonstration purposes and are not yet wired to a backend API.
            </AlertDescription>
          </Alert>
          {children}
        </main>
      </div>
    </div>
  );
}
