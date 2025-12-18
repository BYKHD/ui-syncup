import { AppHeaderConfigurator, type BreadcrumbItem } from "@/components/shared/headers";
import { LinkedAccounts } from "@/features/user-settings/components";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Linked Accounts",
  description: "Manage your connected social accounts",
};

const LINKED_ACCOUNTS_BREADCRUMBS: BreadcrumbItem[] = [
  { label: "Settings", href: "/settings" },
  { label: "Linked Accounts" },
];

export default function LinkedAccountsPage() {
  return (
    <>
      <AppHeaderConfigurator
        pageName="Linked Accounts"
        breadcrumbs={LINKED_ACCOUNTS_BREADCRUMBS}
      />
      <div className="space-y-6">
        <LinkedAccounts />
      </div>
    </>
  );
}
