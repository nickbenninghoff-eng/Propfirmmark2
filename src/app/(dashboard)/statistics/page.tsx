import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  TrendingDown,
  Target,
  BarChart3,
  DollarSign,
  Percent,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Statistics",
  description: "View your trading statistics",
};

// Mock statistics data
const stats = {
  totalProfit: 9750,
  totalTrades: 156,
  winningTrades: 98,
  losingTrades: 58,
  winRate: 62.8,
  avgWin: 245.5,
  avgLoss: -125.3,
  profitFactor: 1.95,
  largestWin: 1250,
  largestLoss: -450,
  avgHoldTime: "2h 15m",
  tradingDays: 28,
};

const instrumentStats = [
  { symbol: "ES", trades: 65, pnl: 4250, winRate: 65 },
  { symbol: "NQ", trades: 48, pnl: 3800, winRate: 62 },
  { symbol: "CL", trades: 25, pnl: 1200, winRate: 56 },
  { symbol: "GC", trades: 18, pnl: 500, winRate: 55 },
];

export default async function StatisticsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Statistics</h1>
        <p className="text-muted-foreground">
          Analyze your trading performance across all accounts
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Profit"
          value={`$${stats.totalProfit.toLocaleString()}`}
          description="Across all accounts"
          icon={DollarSign}
          trend={{ value: 12.5, isPositive: true }}
        />
        <StatCard
          title="Win Rate"
          value={`${stats.winRate}%`}
          description={`${stats.winningTrades}W / ${stats.losingTrades}L`}
          icon={Target}
        />
        <StatCard
          title="Profit Factor"
          value={stats.profitFactor.toFixed(2)}
          description="Gross profit / Gross loss"
          icon={BarChart3}
        />
        <StatCard
          title="Total Trades"
          value={stats.totalTrades}
          description={`Over ${stats.tradingDays} trading days`}
          icon={TrendingUp}
        />
      </div>

      {/* Win/Loss Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="relative rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-cyan-500/5 backdrop-blur-xl p-6">
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent rounded-2xl" />
          <div className="relative space-y-4">
            <h3 className="text-lg font-semibold text-white">Win/Loss Breakdown</h3>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-white/60">Win Rate</span>
                <span className="font-medium text-emerald-400">{stats.winRate}%</span>
              </div>
              <Progress
                value={stats.winRate}
                className="h-3 bg-white/10 [&>div]:bg-gradient-to-r [&>div]:from-emerald-500 [&>div]:to-cyan-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-white/60">Winning Trades</p>
                <p className="text-2xl font-bold text-emerald-400">{stats.winningTrades}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-white/60">Losing Trades</p>
                <p className="text-2xl font-bold text-rose-400">{stats.losingTrades}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-violet-500/5 to-cyan-500/5 backdrop-blur-xl p-6">
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent rounded-2xl" />
          <div className="relative space-y-4">
            <h3 className="text-lg font-semibold text-white">Average Trade</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-white/60">Avg Win</p>
                <p className="text-2xl font-bold text-emerald-400">
                  +${stats.avgWin.toFixed(2)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-white/60">Avg Loss</p>
                <p className="text-2xl font-bold text-rose-400">
                  ${stats.avgLoss.toFixed(2)}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-white/60">Largest Win</p>
                <p className="text-lg font-semibold text-emerald-400">
                  +${stats.largestWin.toLocaleString()}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-white/60">Largest Loss</p>
                <p className="text-lg font-semibold text-rose-400">
                  ${stats.largestLoss.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance by Instrument */}
      <div className="relative rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 via-cyan-500/5 to-violet-500/5 backdrop-blur-xl p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent rounded-2xl" />
        <div className="relative">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-1">Performance by Instrument</h3>
            <p className="text-sm text-white/60">Breakdown of your trading by symbol</p>
          </div>
          <div className="space-y-4">
            {instrumentStats.map((instrument) => (
              <div key={instrument.symbol} className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center font-bold text-white">
                  {instrument.symbol}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-white">{instrument.symbol}</span>
                    <span className={cn(
                      "font-semibold",
                      instrument.pnl >= 0 ? "text-emerald-400" : "text-rose-400"
                    )}>
                      {instrument.pnl >= 0 ? "+" : ""}${instrument.pnl.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-white/60">
                    <span>{instrument.trades} trades</span>
                    <span>{instrument.winRate}% win rate</span>
                  </div>
                  <Progress
                    value={instrument.winRate}
                    className="h-2 bg-white/10 [&>div]:bg-gradient-to-r [&>div]:from-cyan-500 [&>div]:to-violet-500"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="relative rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl p-6">
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent rounded-2xl" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-medium text-white/80">Avg Hold Time</h4>
              <TrendingUp className="h-4 w-4 text-white/40" />
            </div>
            <div className="text-2xl font-bold text-white">{stats.avgHoldTime}</div>
            <p className="text-xs text-white/60 mt-1">Per trade</p>
          </div>
        </div>
        <div className="relative rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl p-6">
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent rounded-2xl" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-medium text-white/80">Trading Days</h4>
              <BarChart3 className="h-4 w-4 text-white/40" />
            </div>
            <div className="text-2xl font-bold text-white">{stats.tradingDays}</div>
            <p className="text-xs text-white/60 mt-1">This month</p>
          </div>
        </div>
        <div className="relative rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl p-6">
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent rounded-2xl" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-medium text-white/80">Risk/Reward</h4>
              <Percent className="h-4 w-4 text-white/40" />
            </div>
            <div className="text-2xl font-bold text-white">1:{(stats.avgWin / Math.abs(stats.avgLoss)).toFixed(1)}</div>
            <p className="text-xs text-white/60 mt-1">Avg win / Avg loss</p>
          </div>
        </div>
      </div>
    </div>
  );
}
