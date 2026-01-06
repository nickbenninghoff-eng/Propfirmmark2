import { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAuditLogs } from "@/server/actions/admin";
import { AuditLogFilters } from "@/components/admin/audit-log-filters";
import { Shield, User, FileText } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Audit Logs",
  description: "View system audit logs and admin actions",
};

interface PageProps {
  searchParams: Promise<{
    page?: string;
    userId?: string;
    entityType?: string;
    action?: string;
  }>;
}

export default async function AuditLogsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");

  const { logs, total, totalPages } = await getAuditLogs(page, 50, {
    userId: params.userId,
    entityType: params.entityType,
    action: params.action,
  });

  const getActionColor = (action: string) => {
    if (action.includes("create")) return "bg-green-500/10 text-green-500 border-green-500/20";
    if (action.includes("delete")) return "bg-red-500/10 text-red-500 border-red-500/20";
    if (action.includes("update") || action.includes("change")) return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    if (action.includes("suspend") || action.includes("ban")) return "bg-orange-500/10 text-orange-500 border-orange-500/20";
    return "bg-gray-500/10 text-gray-500 border-gray-500/20";
  };

  const getEntityIcon = (entityType: string) => {
    if (entityType === "user") return <User className="h-4 w-4" />;
    if (entityType === "trading_account") return <FileText className="h-4 w-4" />;
    return <Shield className="h-4 w-4" />;
  };

  const formatData = (data: any) => {
    if (!data) return null;
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit Logs</h1>
        <p className="text-muted-foreground">
          Track all administrative actions and system changes
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Logs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Current Page
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{logs.length}</div>
            <p className="text-xs text-muted-foreground">
              Page {page} of {totalPages}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Unique Admins
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(logs.map((log) => log.userId).filter(Boolean)).size}
            </div>
            <p className="text-xs text-muted-foreground">On this page</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <AuditLogFilters />

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
          <CardDescription>
            Detailed log of all administrative actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No audit logs found
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="border rounded-lg p-4 space-y-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        {getEntityIcon(log.entityType)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={getActionColor(log.action)}>
                            {log.action}
                          </Badge>
                          <Badge variant="outline">{log.entityType}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {log.user ? (
                            <>
                              By{" "}
                              <span className="font-medium text-foreground">
                                {log.user.firstName} {log.user.lastName}
                              </span>{" "}
                              ({log.user.email})
                            </>
                          ) : (
                            "System action"
                          )}
                        </p>
                        {(log as any).affectedUser && (
                          <p className="text-sm font-medium text-foreground mt-1">
                            Trader:{" "}
                            <span className="text-primary">
                              {(log as any).affectedUser.firstName} {(log as any).affectedUser.lastName}
                            </span>{" "}
                            <span className="text-muted-foreground text-xs">
                              ({(log as any).affectedUser.email})
                            </span>
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(log.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {(log.previousData || log.newData) && (
                    <div className="grid grid-cols-2 gap-4 mt-3">
                      {log.previousData && (
                        <div>
                          <h4 className="text-sm font-medium mb-2">Previous Data</h4>
                          <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-32">
                            {formatData(log.previousData)}
                          </pre>
                        </div>
                      )}
                      {log.newData && (
                        <div>
                          <h4 className="text-sm font-medium mb-2">New Data</h4>
                          <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-32">
                            {formatData(log.newData)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}

                  {log.ipAddress && (
                    <div className="flex gap-4 text-xs text-muted-foreground pt-2 border-t">
                      <span>IP: {log.ipAddress}</span>
                      {log.userAgent && (
                        <span className="truncate max-w-md" title={log.userAgent}>
                          UA: {log.userAgent}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-muted-foreground">
                Showing {logs.length} of {total} total logs
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`?page=${page - 1}`}>Previous</Link>
                  </Button>
                )}
                {page < totalPages && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`?page=${page + 1}`}>Next</Link>
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
