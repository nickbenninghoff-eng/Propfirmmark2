import { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSiteSettings, getAnnouncements } from "@/server/actions/admin";
import { EmergencyControls, AnnouncementsManager } from "@/components/admin/settings-controls";

export const metadata: Metadata = {
  title: "Admin Settings",
  description: "Platform settings and emergency controls",
};

export default async function SettingsPage() {
  const settings = await getSiteSettings();
  const announcements = await getAnnouncements();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Platform Settings</h1>
        <p className="text-muted-foreground">
          Manage platform settings and emergency controls
        </p>
      </div>

      {/* Emergency Controls */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Emergency Controls</h2>
        <EmergencyControls initialSettings={settings} />
      </div>

      {/* Announcements */}
      <AnnouncementsManager announcements={announcements} />

      {/* Platform Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Configuration</CardTitle>
          <CardDescription>General platform settings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Current Settings</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Trading Enabled: {settings.trading_enabled !== false ? "Yes" : "No"}</p>
                <p>Markets Status: {(settings.markets_closed as { closed?: boolean })?.closed ? "Closed" : "Open"}</p>
                <p>Maintenance Mode: {(settings.maintenance_mode as { enabled?: boolean })?.enabled ? "Active" : "Off"}</p>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Platform Info</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>App Name: {process.env.NEXT_PUBLIC_APP_NAME || "PropFirm"}</p>
                <p>App URL: {process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Integrations Status */}
      <Card>
        <CardHeader>
          <CardTitle>Integration Status</CardTitle>
          <CardDescription>External service connections</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <h4 className="font-medium">Database</h4>
              <p className="text-sm text-green-500">Connected</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <h4 className="font-medium">Stripe</h4>
              <p className="text-sm text-muted-foreground">
                {process.env.STRIPE_SECRET_KEY ? "Configured" : "Not configured"}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <h4 className="font-medium">Rithmic</h4>
              <p className="text-sm text-muted-foreground">
                {process.env.RITHMIC_API_KEY ? "Configured" : "Not configured"}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <h4 className="font-medium">Email (Resend)</h4>
              <p className="text-sm text-muted-foreground">
                {process.env.RESEND_API_KEY ? "Configured" : "Not configured"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
