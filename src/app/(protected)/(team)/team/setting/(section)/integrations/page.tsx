import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@components/ui/card";

export default function IntegrationsSettingsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Display</CardTitle>
        <CardDescription>
          Configure Integrations settings and preferences.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Integrations settings coming soon...
        </p>
      </CardContent>
    </Card>
  );
}
