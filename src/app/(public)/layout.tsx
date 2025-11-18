import { AppShell } from "@/components/layout/app-shell";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell variant="blank">{children}</AppShell>;
}
