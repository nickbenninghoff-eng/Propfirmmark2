import { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getSystemHealth } from "@/server/actions/admin";
import {
  Activity,
  Database,
  CreditCard,
  Mail,
  Server,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "System Health",
  description: "Monitor system health and service status",
};

export default async function SystemHealthPage() {
  const health = await getSystemHealth();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "healthy":
      case "configured":
        return (
          <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
            <CheckCircle className="h-3 w-3 mr-1" />
            {status === "healthy" ? "Healthy" : "Configured"}
          </Badge>
        );
      case "not_configured":
        return (
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Not Configured
          </Badge>
        );
      case "unhealthy":
      case "error":
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
            <XCircle className="h-3 w-3 mr-1" />
            Unhealthy
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const services = [
    {
      name: "Database",
      icon: Database,
      status: health.database.status,
      message: health.database.message,
      details: "PostgreSQL connection",
    },
    {
      name: "Stripe",
      icon: CreditCard,
      status: health.stripe.status,
      message: health.stripe.message,
      details: "Payment processing",
    },
    {
      name: "Rithmic",
      icon: Server,
      status: health.rithmic.status,
      message: health.rithmic.message,
      details: "Trading platform integration",
    },
    {
      name: "Email (Resend)",
      icon: Mail,
      status: health.email.status,
      message: health.email.message,
      details: "Email notifications",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">System Health</h1>
        <p className="text-muted-foreground">
          Monitor platform health and service integrations
        </p>
      </div>

      {/* Overall Status */}
      <Card className={cn(
        "border-2",
        health.database.status === "healthy" ? "border-green-500/20" : "border-red-500/20"
      )}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Status
          </CardTitle>
          <CardDescription>
            Last checked: {new Date().toLocaleString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {health.database.status === "healthy" ? (
              <span className="text-green-500 flex items-center gap-2">
                <CheckCircle className="h-6 w-6" />
                All Systems Operational
              </span>
            ) : (
              <span className="text-red-500 flex items-center gap-2">
                <XCircle className="h-6 w-6" />
                System Issues Detected
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Service Status */}
      <div className="grid gap-4 md:grid-cols-2">
        {services.map((service) => (
          <Card key={service.name}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    service.status === "healthy" || service.status === "configured"
                      ? "bg-green-500/10"
                      : service.status === "not_configured"
                      ? "bg-yellow-500/10"
                      : "bg-red-500/10"
                  )}>
                    <service.icon className={cn(
                      "h-5 w-5",
                      service.status === "healthy" || service.status === "configured"
                        ? "text-green-500"
                        : service.status === "not_configured"
                        ? "text-yellow-500"
                        : "text-red-500"
                    )} />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{service.name}</CardTitle>
                    <CardDescription>{service.details}</CardDescription>
                  </div>
                </div>
                {getStatusBadge(service.status)}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{service.message}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Activity Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            24-Hour Activity
          </CardTitle>
          <CardDescription>
            Platform activity metrics from the last 24 hours
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Transactions</p>
              </div>
              <p className="text-2xl font-bold">{health.activity.transactionsLast24h}</p>
              <p className="text-xs text-muted-foreground mt-1">Completed transactions</p>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Active Users</p>
              </div>
              <p className="text-2xl font-bold">{health.activity.activeUsersLast24h}</p>
              <p className="text-xs text-muted-foreground mt-1">Users who logged in</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Environment Info */}
      <Card>
        <CardHeader>
          <CardTitle>Environment Information</CardTitle>
          <CardDescription>Platform configuration details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Node Environment</span>
              <span className="font-medium">{process.env.NODE_ENV || "development"}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">App Name</span>
              <span className="font-medium">{process.env.NEXT_PUBLIC_APP_NAME || "PropFirm"}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">App URL</span>
              <span className="font-medium">{process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Database Type</span>
              <span className="font-medium">PostgreSQL</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
