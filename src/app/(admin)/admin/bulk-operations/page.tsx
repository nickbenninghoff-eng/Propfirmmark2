import { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BulkNotifications, BulkAccountActions } from "@/components/admin/bulk-operations";
import { Bell, Users, Zap } from "lucide-react";

export const metadata: Metadata = {
  title: "Bulk Operations",
  description: "Perform bulk operations on users and accounts",
};

export default function BulkOperationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Bulk Operations</h1>
        <p className="text-muted-foreground">
          Perform actions on multiple users or accounts at once
        </p>
      </div>

      {/* Warning Card */}
      <Card className="border-yellow-500/50 bg-yellow-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-500">
            <Zap className="h-5 w-5" />
            Use with Caution
          </CardTitle>
          <CardDescription>
            Bulk operations affect multiple records at once and cannot be easily undone.
            All actions are logged in the audit trail.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Bulk Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Bulk Notifications
          </CardTitle>
          <CardDescription>
            Send notifications to multiple users at once
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BulkNotifications />
        </CardContent>
      </Card>

      {/* Bulk Account Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Bulk Account Actions
          </CardTitle>
          <CardDescription>
            Perform actions on multiple trading accounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BulkAccountActions />
        </CardContent>
      </Card>
    </div>
  );
}
