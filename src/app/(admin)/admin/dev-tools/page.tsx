import { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateTestDataButton, UpdateAdminNameForm } from "@/components/admin/dev-tools";
import { Database, Users, User } from "lucide-react";

export const metadata: Metadata = {
  title: "Dev Tools",
  description: "Development and testing utilities",
};

export default function DevToolsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Developer Tools</h1>
        <p className="text-muted-foreground">
          Testing and development utilities (only use in development)
        </p>
      </div>

      <Card className="border-yellow-500/50 bg-yellow-500/5">
        <CardHeader>
          <CardTitle className="text-yellow-500">Development Only</CardTitle>
          <CardDescription>
            These tools are for testing and development. Do not use in production.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Test Data Generator
            </CardTitle>
            <CardDescription>
              Create sample users, accounts, and tiers for testing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateTestDataButton />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Generated Test Accounts
            </CardTitle>
            <CardDescription>
              Login credentials for test accounts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div>
                <h4 className="font-medium mb-2">Test Traders:</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• john@test.com</li>
                  <li>• jane@test.com</li>
                  <li>• mike@test.com</li>
                  <li>• sarah@test.com</li>
                  <li>• tom@test.com</li>
                </ul>
                <p className="mt-2 font-medium">Password: <code className="bg-muted px-2 py-1 rounded">Trader123!</code></p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Update Admin Name
            </CardTitle>
            <CardDescription>
              Set your first and last name for audit logs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UpdateAdminNameForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
