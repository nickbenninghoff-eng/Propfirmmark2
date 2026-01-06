import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { StatCard } from "@/components/dashboard/stat-card";
import { HeroBalance } from "@/components/trading-journal/hero-balance";
import { EquityCurveChart } from "@/components/trading-journal/equity-curve-chart";
import { PerformanceMetrics } from "@/components/trading-journal/performance-metrics";
import { AccountJournalView } from "@/components/trading-journal/account-journal-view";
import {
  ArrowLeft,
  Target,
  AlertTriangle,
  Calendar,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { db } from "@/lib/db";
import { tradingAccounts, trades } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getEquityCurveData, calculateEquityMetrics, backfillEquitySnapshots, getDailyPnLData } from "@/server/services/equity-service";
import { format } from "date-fns";

export const metadata: Metadata = {
  title: "Account Details",
  description: "View your trading account details",
};

const statusColors: Record<string, string> = {
  active: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  passed: "bg-violet-500/10 text-violet-500 border-violet-500/20",
  funded: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  failed: "bg-rose-500/10 text-rose-500 border-rose-500/20",
};

const statusLabels: Record<string, string> = {
  active: "Active",
  passed: "Passed",
  funded: "Funded",
  failed: "Failed",
};

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ accountId: string }>;
}) {
  const session = await auth();
  const { accountId } = await params;

  if (!session?.user) {
    redirect("/login");
  }

  // Fetch account with tier
  const account = await db.query.tradingAccounts.findFirst({
    where: eq(tradingAccounts.id, accountId),
    with: {
      tier: true,
    },
  });

  if (!account) {
    notFound();
  }

  // Verify account belongs to user (or user is admin)
  if (account.userId !== session.user.id && session.user.role !== "admin" && session.user.role !== "super_admin") {
    notFound();
  }

  // Fetch trades
  const accountTrades = await db.query.trades.findMany({
    where: eq(trades.tradingAccountId, accountId),
    orderBy: (trades, { desc }) => [desc(trades.entryTime)],
    limit: 50,
  });

  // Get equity curve data (try to fetch, if empty, backfill)
  let equityData = await getEquityCurveData(accountId);

  // If no equity snapshots exist and there are trades, backfill them
  if (equityData.length === 0 && accountTrades.length > 0) {
    await backfillEquitySnapshots(accountId);
    equityData = await getEquityCurveData(accountId);
  }

  // If still no data, create an initial snapshot
  if (equityData.length === 0) {
    equityData = [{
      timestamp: account.createdAt.toISOString(),
      balance: Number(account.initialBalance),
      equity: Number(account.initialBalance),
      unrealizedPnl: 0,
    }];
  }

  // Calculate metrics
  const metrics = await calculateEquityMetrics(accountId);

  // Get daily P&L data for calendar heatmap (fetch ALL trades, calendar will filter by month)
  const dailyPnLData = await getDailyPnLData(accountId);

  // Get the month with the most recent trade for initial calendar display
  const latestTrade = accountTrades[0]; // Already sorted by desc(trades.entryTime)
  const calendarMonth = latestTrade?.exitTime ? new Date(latestTrade.exitTime) : new Date();

  // Calculate derived values
  const currentBalance = Number(account.currentBalance);
  const initialBalance = Number(account.initialBalance);
  const pnl = currentBalance - initialBalance;
  const pnlPercent = (pnl / initialBalance) * 100;
  const isProfit = pnl >= 0;

  const profitTarget = Number(account.tier?.profitTarget || 0);
  const maxDrawdown = Number(account.tier?.maxDrawdown || 0);
  const currentDrawdown = Number(account.currentDrawdown);

  const winRate = account.totalTrades > 0
    ? (account.winningTrades / account.totalTrades) * 100
    : 0;
  const profitProgress = profitTarget > 0
    ? Math.min((Math.max(0, pnl) / profitTarget) * 100, 100)
    : 0;
  const drawdownUsed = maxDrawdown > 0
    ? (currentDrawdown / maxDrawdown) * 100
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/accounts">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {account.accountNumber}
            </h1>
            <p className="text-muted-foreground">{account.tier?.displayName}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset Account
          </Button>
        </div>
      </div>

      {/* Hero Balance Section */}
      <HeroBalance
        currentBalance={currentBalance}
        initialBalance={initialBalance}
        accountNumber={account.accountNumber || "N/A"}
        status={account.status as "active" | "funded" | "passed" | "failed"}
      />

      {/* Equity Curve Chart */}
      {equityData.length > 0 && (
        <EquityCurveChart
          data={equityData}
          initialBalance={initialBalance}
        />
      )}

      {/* Performance Metrics */}
      {metrics.totalTrades > 0 && (
        <PerformanceMetrics
          sharpeRatio={metrics.sharpeRatio}
          profitFactor={metrics.profitFactor}
          winRate={metrics.winRate}
          avgWinLoss={metrics.avgWinLoss}
        />
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Profit Target Progress"
          value={`${profitProgress.toFixed(1)}%`}
          description={`$${Math.max(0, pnl).toLocaleString()} / $${profitTarget.toLocaleString()}`}
          icon={Target}
        />
        <StatCard
          title="Drawdown Used"
          value={`${drawdownUsed.toFixed(1)}%`}
          description={`$${currentDrawdown.toLocaleString()} / $${maxDrawdown.toLocaleString()}`}
          icon={AlertTriangle}
        />
        <StatCard
          title="Trading Days"
          value={`${account.tradingDaysCount} / ${account.tier?.minTradingDays || 0}`}
          description={
            account.tradingDaysCount >= (account.tier?.minTradingDays || 0)
              ? "Requirement met"
              : "Keep trading"
          }
          icon={Calendar}
        />
      </div>

      {/* Progress Cards */}
      {account.accountType === "prop_firm" && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="relative rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 backdrop-blur-xl p-6">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent rounded-2xl" />
            <div className="relative">
              <h3 className="text-lg font-semibold text-white mb-1">Profit Target</h3>
              <p className="text-sm text-white/60 mb-4">
                Reach ${profitTarget.toLocaleString()} to pass
              </p>
              <Progress value={Math.max(0, profitProgress)} className="h-3 mb-2 bg-white/10 [&>div]:bg-gradient-to-r [&>div]:from-emerald-500 [&>div]:to-cyan-500" />
              <p className="text-sm text-white/60">
                {profitProgress >= 100
                  ? "Target reached!"
                  : `$${(profitTarget - Math.max(0, pnl)).toLocaleString()} remaining`}
              </p>
            </div>
          </div>

          <div className="relative rounded-2xl border border-rose-500/20 bg-gradient-to-br from-rose-500/10 to-rose-500/5 backdrop-blur-xl p-6">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent rounded-2xl" />
            <div className="relative">
              <h3 className="text-lg font-semibold text-white mb-1">Drawdown</h3>
              <p className="text-sm text-white/60 mb-4">
                Threshold: ${(initialBalance - maxDrawdown).toLocaleString()}
              </p>
              <Progress
                value={drawdownUsed}
                className={cn("h-3 mb-2 bg-white/10", drawdownUsed > 80 ? "[&>div]:bg-rose-500" : "[&>div]:bg-gradient-to-r [&>div]:from-amber-500 [&>div]:to-orange-500")}
              />
              <p className="text-sm text-white/60">
                ${(maxDrawdown - currentDrawdown).toLocaleString()} buffer remaining
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Journal View (Calendar + Trades) */}
      <AccountJournalView
        accountId={accountId}
        trades={accountTrades}
        dailyPnLData={dailyPnLData}
        initialMonth={calendarMonth}
      />

      {/* Account Rules */}
      {account.accountType === "prop_firm" && (
        <div className="relative rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 to-violet-500/5 backdrop-blur-xl p-6">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent rounded-2xl" />
            <div className="relative">
              <h3 className="text-lg font-semibold text-white mb-1">Account Rules</h3>
              <p className="text-sm text-white/60 mb-6">Rules for this evaluation account</p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-white/60">Profit Target</span>
                    <span className="font-medium text-white">${profitTarget.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Max Drawdown</span>
                    <span className="font-medium text-white">${maxDrawdown.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Daily Loss Limit</span>
                    <span className="font-medium text-white">
                      ${Number(account.tier?.dailyLossLimit || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-white/60">Min Trading Days</span>
                    <span className="font-medium text-white">{account.tier?.minTradingDays || 0} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Profit Split</span>
                    <span className="font-medium text-white">{account.tier?.profitSplit}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Drawdown Type</span>
                    <span className="font-medium text-white capitalize">
                      {account.tier?.drawdownType.replace("_", " ")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
