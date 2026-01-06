import { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatCard } from "@/components/dashboard/stat-card";
import {
  DollarSign,
  Users,
  Wallet,
  TrendingUp,
  ArrowRight,
  CheckCircle,
  XCircle,
  Settings,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getAdminDashboardMetrics, getRecentTransactions, getPendingPayouts } from "@/server/actions/admin";

export const metadata: Metadata = {
  title: "Admin Dashboard",
  description: "Platform administration overview",
};

export default async function AdminDashboardPage() {
  const metrics = await getAdminDashboardMetrics();
  const recentTransactions = await getRecentTransactions(5);
  const pendingPayouts = await getPendingPayouts();

  // Calculate revenue growth percentage
  const revenueGrowth = metrics.revenueLastMonth > 0
    ? ((metrics.revenueThisMonth - metrics.revenueLastMonth) / metrics.revenueLastMonth * 100)
    : 0;

  // Build accounts overview from the metrics
  const accountsOverview = [
    { status: "Active Evaluations", count: metrics.accountsByStatus.active || 0, color: "text-green-500" },
    { status: "Funded Accounts", count: metrics.accountsByStatus.funded || 0, color: "text-purple-500" },
    { status: "Passed (Pending Funding)", count: metrics.accountsByStatus.passed || 0, color: "text-blue-500" },
    { status: "Failed", count: metrics.accountsByStatus.failed || 0, color: "text-red-500" },
  ];

  const totalActiveAccounts = (metrics.accountsByStatus.active || 0) + (metrics.accountsByStatus.funded || 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Platform overview and key metrics
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/settings">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Link>
          </Button>
          <Button variant="destructive" asChild>
            <Link href="/admin/settings#emergency">
              <AlertTriangle className="mr-2 h-4 w-4" />
              Emergency Controls
            </Link>
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Revenue This Month"
          value={`$${metrics.revenueThisMonth.toLocaleString()}`}
          description="From completed transactions"
          icon={DollarSign}
          trend={revenueGrowth !== 0 ? { value: Math.round(revenueGrowth * 10) / 10, isPositive: revenueGrowth > 0 } : undefined}
        />
        <StatCard
          title="Total Users"
          value={metrics.totalUsers.toLocaleString()}
          description={`+${metrics.newUsersThisMonth} this month`}
          icon={Users}
        />
        <StatCard
          title="Active Accounts"
          value={totalActiveAccounts}
          description="Evaluations + Funded"
          icon={Wallet}
        />
        <StatCard
          title="Pass Rate"
          value={`${metrics.passRate}%`}
          description="Evaluation success rate"
          icon={TrendingUp}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Accounts Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Accounts Overview</CardTitle>
            <CardDescription>Current status of all trading accounts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {accountsOverview.map((item) => (
                <div key={item.status} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-3 h-3 rounded-full", item.color.replace("text-", "bg-"))} />
                    <span className="text-sm">{item.status}</span>
                  </div>
                  <span className={cn("font-semibold", item.color)}>{item.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pending Payouts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Pending Payouts</CardTitle>
              <CardDescription>
                {metrics.pendingPayoutsCount} requests (${metrics.pendingPayoutsAmount.toLocaleString()} total)
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/payouts">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {pendingPayouts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No pending payout requests
              </p>
            ) : (
              <div className="space-y-3">
                {pendingPayouts.slice(0, 3).map((payout) => (
                  <div key={payout.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">
                        {payout.user?.firstName} {payout.user?.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {payout.tradingAccount?.accountNumber || "N/A"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">${Number(payout.requestedAmount).toLocaleString()}</span>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-green-500">
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500">
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Latest account purchases and resets</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/analytics">
              View Analytics
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentTransactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No transactions yet
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTransactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="font-medium">
                      {tx.user?.firstName} {tx.user?.lastName}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {tx.type}
                      </Badge>
                    </TableCell>
                    <TableCell>{tx.tradingAccount?.tier?.displayName || "N/A"}</TableCell>
                    <TableCell className="text-green-500 font-medium">
                      +${Number(tx.amount).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <Link href="/admin/users">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Manage Users
              </CardTitle>
              <CardDescription>View and edit user accounts</CardDescription>
            </CardHeader>
          </Link>
        </Card>
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <Link href="/admin/accounts">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Manage Accounts
              </CardTitle>
              <CardDescription>Review trading accounts</CardDescription>
            </CardHeader>
          </Link>
        </Card>
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <Link href="/admin/payouts">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Process Payouts
              </CardTitle>
              <CardDescription>{metrics.pendingPayoutsCount} pending requests</CardDescription>
            </CardHeader>
          </Link>
        </Card>
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <Link href="/admin/tiers">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Manage Tiers
              </CardTitle>
              <CardDescription>Edit account tiers</CardDescription>
            </CardHeader>
          </Link>
        </Card>
      </div>
    </div>
  );
}
