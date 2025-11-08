import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@components/ui/card";

export default function AccountSettingsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Account</CardTitle>
        <CardDescription>
          Manage your account security and authentication settings.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Account settings coming soon...
        </p>
      </CardContent>
    </Card>
  );
}
