import { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  generateRevenueReport,
  generateUserReport,
  generateAccountPerformanceReport,
} from "@/server/actions/admin";
import { ReportDownload } from "@/components/admin/report-download";
import { BarChart, TrendingUp, Users, DollarSign, Target } from "lucide-react";

export const metadata: Metadata = {
  title: "Reports & Analytics",
  description: "Generate and download platform reports",
};

export default async function ReportsPage() {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  const revenueReport = await generateRevenueReport(startDate, endDate);
  const userReport = await generateUserReport();
  const accountReport = await generateAccountPerformanceReport();

  const totalRevenue = revenueReport.reduce((sum, day) => sum + Number(day.total), 0);
  const avgDailyRevenue = totalRevenue / revenueReport.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports & Analytics</h1>
        <p className="text-muted-foreground">
          Generate and export platform performance reports
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              30-Day Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              Avg ${avgDailyRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/day
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Number(userReport.total).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {Number(userReport.withAccounts)} with accounts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Target className="h-4 w-4" />
              Account Pass Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {accountReport
                .reduce((sum, r) => sum + (Number(r.passRate) || 0), 0)
                .toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">Overall platform</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Avg Trades/Account
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {accountReport
                .reduce((sum, r) => sum + (Number(r.avgTrades) || 0), 0)
                .toFixed(0)}
            </div>
            <p className="text-xs text-muted-foreground">Across all accounts</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Report */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart className="h-5 w-5" />
            Revenue Report (Last 30 Days)
          </CardTitle>
          <CardDescription>
            Daily revenue breakdown from completed transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Date</th>
                    <th className="text-right p-2">Revenue</th>
                    <th className="text-right p-2">Transactions</th>
                  </tr>
                </thead>
                <tbody>
                  {revenueReport.slice(-10).reverse().map((day) => (
                    <tr key={day.date} className="border-b last:border-0">
                      <td className="p-2">
                        {new Date(day.date).toLocaleDateString()}
                      </td>
                      <td className="text-right p-2 font-medium text-green-500">
                        ${Number(day.total).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="text-right p-2">{Number(day.count)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ReportDownload
              data={revenueReport}
              filename="revenue-report"
              label="Download Full Report (CSV)"
            />
          </div>
        </CardContent>
      </Card>

      {/* User Report */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Statistics
          </CardTitle>
          <CardDescription>Platform user metrics and engagement</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Total Users</p>
              <p className="text-2xl font-bold">{Number(userReport.total).toLocaleString()}</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Active Users</p>
              <p className="text-2xl font-bold text-green-500">
                {Number(userReport.active).toLocaleString()}
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Suspended Users</p>
              <p className="text-2xl font-bold text-red-500">
                {Number(userReport.suspended).toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Performance Report */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Account Performance by Status
          </CardTitle>
          <CardDescription>
            Performance metrics grouped by account status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Status</th>
                  <th className="text-right p-2">Count</th>
                  <th className="text-right p-2">Avg Trades</th>
                  <th className="text-right p-2">Avg Profit</th>
                  <th className="text-right p-2">Pass Rate</th>
                </tr>
              </thead>
              <tbody>
                {accountReport.map((row) => (
                  <tr key={row.status} className="border-b last:border-0">
                    <td className="p-2 font-medium capitalize">{row.status}</td>
                    <td className="text-right p-2">{Number(row.count)}</td>
                    <td className="text-right p-2">
                      {Number(row.avgTrades || 0).toFixed(0)}
                    </td>
                    <td className="text-right p-2">
                      ${Number(row.avgProfit || 0).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="text-right p-2">
                      {Number(row.passRate || 0).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4">
            <ReportDownload
              data={accountReport}
              filename="account-performance-report"
              label="Download Report (CSV)"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
