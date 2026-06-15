"use client";

import { UserSettingsAside } from "@/components/shared/settings-sidebar";
import { USER_SETTINGS_NAV } from "@/config/user-settings-nav";

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
          {children}
        </main>
      </div>
    </div>
  );
}
