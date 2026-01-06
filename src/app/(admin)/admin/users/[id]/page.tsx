import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Mail, Calendar, Shield, Ban, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { db } from "@/lib/db";
import { users, tradingAccounts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const user = await db.query.users.findFirst({
    where: eq(users.id, id),
  });

  return {
    title: user ? `${user.firstName} ${user.lastName} - User Details` : "User Not Found",
    description: "View user details and trading accounts",
  };
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function UserDetailPage({ params }: PageProps) {
  const { id } = await params;

  const user = await db.query.users.findFirst({
    where: eq(users.id, id),
  });

  if (!user) {
    notFound();
  }

  const accounts = await db.query.tradingAccounts.findMany({
    where: eq(tradingAccounts.userId, id),
    with: {
      tier: {
        columns: { displayName: true, accountSize: true },
      },
    },
    orderBy: (accounts, { desc }) => [desc(accounts.createdAt)],
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "funded":
        return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case "passed":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "failed":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      case "suspended":
        return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  const totalProfit = accounts.reduce((sum, acc) => sum + Number(acc.totalProfit), 0);
  const totalTrades = accounts.reduce((sum, acc) => sum + acc.totalTrades, 0);

  // Calculate status counts
  const statusCounts = accounts.reduce((acc, account) => {
    acc[account.status] = (acc[account.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" size="sm" asChild>
        <Link href="/admin/users">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Users
        </Link>
      </Button>

      {/* User Info */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="text-lg">
                  {(user.firstName?.[0] || "") + (user.lastName?.[0] || "") || user.email[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-2xl">
                  {user.firstName || user.lastName
                    ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
                    : "No name"}
                </CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  <Mail className="h-4 w-4" />
                  {user.email}
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className={cn(
                user.role === "admin" || user.role === "super_admin"
                  ? "bg-purple-500/10 text-purple-500 border-purple-500/20"
                  : "bg-gray-500/10 text-gray-500 border-gray-500/20"
              )}>
                <Shield className="mr-1 h-3 w-3" />
                {user.role}
              </Badge>
              <Badge variant="outline" className={cn(
                user.isSuspended
                  ? "bg-red-500/10 text-red-500 border-red-500/20"
                  : "bg-green-500/10 text-green-500 border-green-500/20"
              )}>
                {user.isSuspended ? (
                  <>
                    <Ban className="mr-1 h-3 w-3" />
                    Suspended
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Active
                  </>
                )}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Member Since</p>
              <p className="font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {new Date(user.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Last Login</p>
              <p className="font-medium">
                {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : "Never"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Referral Code</p>
              <p className="font-medium font-mono">{user.referralCode || "N/A"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Accounts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accounts.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">
              {statusCounts.active || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Funded
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-500">
              {statusCounts.funded || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Passed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {statusCounts.passed || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {statusCounts.failed || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Statistics */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Trades
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTrades}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total P/L
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-2xl font-bold",
              totalProfit > 0 ? "text-green-500" : totalProfit < 0 ? "text-red-500" : ""
            )}>
              {totalProfit > 0 ? "+" : ""}${totalProfit.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trading Accounts */}
      <Card>
        <CardHeader>
          <CardTitle>Trading Accounts</CardTitle>
          <CardDescription>
            All accounts (past and present) for this user
          </CardDescription>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No trading accounts yet
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account #</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>P/L</TableHead>
                  <TableHead>Trades</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-mono font-medium">
                      <Link
                        href={`/admin/accounts?search=${account.accountNumber}`}
                        className="hover:underline"
                      >
                        {account.accountNumber || "N/A"}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {account.tier?.displayName || "N/A"}
                      <p className="text-sm text-muted-foreground">
                        ${Number(account.tier?.accountSize || 0).toLocaleString()}
                      </p>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        ${Number(account.currentBalance).toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "font-medium",
                          Number(account.totalProfit) > 0
                            ? "text-green-500"
                            : Number(account.totalProfit) < 0
                            ? "text-red-500"
                            : ""
                        )}
                      >
                        {Number(account.totalProfit) > 0 ? "+" : ""}$
                        {Number(account.totalProfit).toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{account.totalTrades}</p>
                        <p className="text-sm text-muted-foreground">
                          {account.tradingDaysCount} days
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(getStatusColor(account.status))}
                      >
                        {account.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(account.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
