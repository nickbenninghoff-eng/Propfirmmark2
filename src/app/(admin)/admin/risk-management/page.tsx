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
import { getAllAccounts, getAdminDashboardMetrics } from "@/server/actions/admin";
import { AlertTriangle, TrendingDown, TrendingUp, Shield, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Risk Management",
  description: "Monitor platform risk and high-risk accounts",
};

export default async function RiskManagementPage() {
  const metrics = await getAdminDashboardMetrics();
  const { accounts } = await getAllAccounts(1, 100);

  // Calculate risk metrics
  const fundedAccounts = accounts.filter(a => a.status === "funded");
  const totalExposure = fundedAccounts.reduce((sum, acc) => sum + Number(acc.currentBalance), 0);
  const totalProfits = fundedAccounts.reduce((sum, acc) => sum + Number(acc.totalProfit), 0);

  // Identify high-risk accounts (near drawdown limit)
  const highRiskAccounts = accounts.filter(account => {
    const drawdown = Number(account.currentDrawdown);
    const threshold = Number(account.drawdownThreshold);
    return threshold > 0 && (drawdown / threshold) > 0.8; // 80% of limit
  }).slice(0, 10);

  // Top profit accounts
  const topProfitAccounts = [...accounts]
    .sort((a, b) => Number(b.totalProfit) - Number(a.totalProfit))
    .slice(0, 5);

  // Top loss accounts
  const topLossAccounts = [...accounts]
    .sort((a, b) => Number(a.totalProfit) - Number(b.totalProfit))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Risk Management</h1>
        <p className="text-muted-foreground">
          Monitor platform exposure and high-risk accounts
        </p>
      </div>

      {/* Risk Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-yellow-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Total Exposure
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalExposure.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              From {fundedAccounts.length} funded accounts
            </p>
          </CardContent>
        </Card>

        <Card className={cn(
          "border-2",
          totalProfits > 0 ? "border-red-500/20" : "border-green-500/20"
        )}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Net Trader Profit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-2xl font-bold",
              totalProfits > 0 ? "text-red-500" : "text-green-500"
            )}>
              {totalProfits > 0 ? "-" : "+"}$
              {Math.abs(totalProfits).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {totalProfits > 0 ? "Liability to firm" : "Profit to firm"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-orange-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              High Risk Accounts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {highRiskAccounts.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Near drawdown limits
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Pass Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {metrics.passRate}%
            </div>
            <p className="text-xs text-muted-foreground">
              Evaluation success rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* High Risk Accounts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            High Risk Accounts
          </CardTitle>
          <CardDescription>
            Accounts approaching drawdown limits (80%+ of threshold)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {highRiskAccounts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No high-risk accounts detected
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Drawdown</TableHead>
                  <TableHead>Risk Level</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {highRiskAccounts.map((account) => {
                  const riskPercent = (Number(account.currentDrawdown) / Number(account.drawdownThreshold)) * 100;
                  return (
                    <TableRow key={account.id}>
                      <TableCell className="font-mono font-medium">
                        {account.accountNumber}
                      </TableCell>
                      <TableCell>
                        {account.user.firstName} {account.user.lastName}
                      </TableCell>
                      <TableCell>
                        ${Number(account.currentBalance).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-red-500">
                            ${Number(account.currentDrawdown).toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            / ${Number(account.drawdownThreshold).toLocaleString()}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            riskPercent >= 95
                              ? "bg-red-500/10 text-red-500 border-red-500/20"
                              : riskPercent >= 90
                              ? "bg-orange-500/10 text-orange-500 border-orange-500/20"
                              : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                          )}
                        >
                          {riskPercent.toFixed(0)}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/admin/accounts?search=${account.accountNumber}`}>
                            View
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Top Performers */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-500">
              <TrendingUp className="h-5 w-5" />
              Top Profit Accounts
            </CardTitle>
            <CardDescription>Accounts with highest profits</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topProfitAccounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-mono font-medium">{account.accountNumber}</p>
                    <p className="text-sm text-muted-foreground">
                      {account.user.firstName} {account.user.lastName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-500">
                      +${Number(account.totalProfit).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {account.totalTrades} trades
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-500">
              <TrendingDown className="h-5 w-5" />
              Top Loss Accounts
            </CardTitle>
            <CardDescription>Accounts with highest losses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topLossAccounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-mono font-medium">{account.accountNumber}</p>
                    <p className="text-sm text-muted-foreground">
                      {account.user.firstName} {account.user.lastName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-red-500">
                      ${Number(account.totalProfit).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {account.totalTrades} trades
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
