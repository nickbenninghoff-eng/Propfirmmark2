import { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wallet, TrendingUp, DollarSign, Target, Plus, ArrowRight, ArrowUpRight, ArrowDownRight, BarChart3, Clock, ChevronRight } from "lucide-react";
import { db } from "@/lib/db";
import { tradingAccounts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "View your trading accounts and statistics",
};

const quickActions = [
  {
    title: "New Evaluation",
    description: "Start a new evaluation account",
    icon: Plus,
    href: "/accounts/purchase",
    gradient: "from-emerald-500 to-cyan-500",
  },
  {
    title: "View Statistics",
    description: "Analyze your trading performance",
    icon: BarChart3,
    href: "/statistics",
    gradient: "from-blue-500 to-violet-500",
  },
  {
    title: "Request Payout",
    description: "Withdraw your profits",
    icon: DollarSign,
    href: "/payouts",
    gradient: "from-orange-500 to-amber-500",
  },
];

function getStatusConfig(status: string) {
  switch (status) {
    case "active":
      return { label: "Active", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" };
    case "funded":
      return { label: "Funded", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" };
    case "passed":
      return { label: "Passed", color: "bg-violet-500/10 text-violet-400 border-violet-500/20" };
    case "failed":
      return { label: "Failed", color: "bg-red-500/10 text-red-400 border-red-500/20" };
    default:
      return { label: status, color: "bg-slate-500/10 text-slate-400 border-slate-500/20" };
  }
}

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Fetch real accounts from database
  const rawAccounts = await db.query.tradingAccounts.findMany({
    where: eq(tradingAccounts.userId, session.user.id),
    with: {
      tier: {
        columns: {
          displayName: true,
          accountSize: true,
          profitTarget: true,
          maxDrawdown: true,
          minTradingDays: true,
        },
      },
    },
    orderBy: (accounts, { desc }) => [desc(accounts.createdAt)],
    limit: 4, // Show only recent 4 accounts on dashboard
  });

  // Transform accounts
  const userAccounts = rawAccounts.map(account => ({
    ...account,
    profitTarget: Number(account.tier?.profitTarget || 0),
    maxDrawdown: Number(account.tier?.maxDrawdown || 0),
    currentBalance: Number(account.currentBalance),
    initialBalance: Number(account.initialBalance),
    currentDrawdown: Number(account.currentDrawdown),
    tradingDays: account.tradingDaysCount,
    minTradingDays: account.tier?.minTradingDays || 5,
  }));

  // Calculate stats
  const totalAccounts = userAccounts.length;
  const activeAccounts = userAccounts.filter(a => a.status === "active" || a.status === "funded").length;
  const totalProfit = userAccounts.reduce((sum, acc) => sum + Number(acc.totalProfit || 0), 0);
  const totalPayouts = 0; // TODO: Calculate from payouts table when implemented

  const userName = session.user.name?.split(" ")[0] || "Trader";
  const greeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-1">
            {greeting}, {userName}
          </h1>
          <p className="text-slate-400">
            Here&apos;s an overview of your trading accounts
          </p>
        </div>
        <Button asChild className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white border-0 shadow-lg shadow-emerald-500/20">
          <Link href="/accounts/purchase">
            <Plus className="mr-2 h-4 w-4" />
            New Account
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { title: "Total Accounts", value: totalAccounts, icon: Wallet, color: "from-blue-500 to-cyan-500", bgColor: "bg-blue-500/10" },
          { title: "Active Accounts", value: activeAccounts, icon: Target, color: "from-emerald-500 to-green-500", bgColor: "bg-emerald-500/10" },
          { title: "Total Profit", value: `$${totalProfit.toLocaleString()}`, icon: TrendingUp, color: "from-violet-500 to-purple-500", bgColor: "bg-violet-500/10" },
          { title: "Total Payouts", value: `$${totalPayouts.toLocaleString()}`, icon: DollarSign, color: "from-orange-500 to-amber-500", bgColor: "bg-orange-500/10" },
        ].map((stat) => (
          <div key={stat.title} className="group relative bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 hover:border-slate-600 transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                <stat.icon className={`h-5 w-5 bg-gradient-to-br ${stat.color} bg-clip-text`} style={{ color: stat.color.includes("emerald") ? "#34d399" : stat.color.includes("blue") ? "#60a5fa" : stat.color.includes("violet") ? "#a78bfa" : "#fb923c" }} />
              </div>
              {stat.trend && (
                <div className="flex items-center gap-1 text-emerald-400 text-sm font-medium">
                  <ArrowUpRight className="h-4 w-4" />
                  {stat.trend}%
                </div>
              )}
            </div>
            <p className="text-2xl font-bold text-white mb-1">{stat.value}</p>
            <p className="text-sm text-slate-400">{stat.title}</p>
          </div>
        ))}
      </div>

      {/* Accounts Section */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Your Accounts</h2>
          <Button variant="ghost" size="sm" asChild className="text-slate-400 hover:text-white hover:bg-slate-800">
            <Link href="/accounts">
              View all
              <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {userAccounts.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {userAccounts.map((account) => {
              const profit = account.currentBalance - account.initialBalance;
              const profitPercent = (profit / account.initialBalance) * 100;
              const progressToTarget = Math.min((profit / account.profitTarget) * 100, 100);
              const drawdownPercent = (account.currentDrawdown / account.maxDrawdown) * 100;
              const statusConfig = getStatusConfig(account.status);

              return (
                <Link key={account.id} href={`/accounts/${account.id}`} className="group">
                  <div className="relative bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 hover:border-slate-600 transition-all duration-300 hover:scale-[1.01]">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-white">{account.accountNumber}</h3>
                          <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
                        </div>
                        <p className="text-sm text-slate-400">{account.tier.displayName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-white">${account.currentBalance.toLocaleString()}</p>
                        <p className={`text-sm font-medium flex items-center justify-end gap-1 ${profit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {profit >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                          ${Math.abs(profit).toLocaleString()} ({profitPercent >= 0 ? "+" : ""}{profitPercent.toFixed(2)}%)
                        </p>
                      </div>
                    </div>

                    {/* Progress bars */}
                    <div className="space-y-4">
                      {/* Profit Target Progress */}
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-slate-400">Profit Target</span>
                          <span className="text-emerald-400 font-medium">${profit.toLocaleString()} / ${account.profitTarget.toLocaleString()}</span>
                        </div>
                        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all duration-500"
                            style={{ width: `${progressToTarget}%` }}
                          />
                        </div>
                      </div>

                      {/* Drawdown Progress */}
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-slate-400">Drawdown Used</span>
                          <span className={`font-medium ${drawdownPercent > 75 ? "text-red-400" : drawdownPercent > 50 ? "text-amber-400" : "text-slate-300"}`}>
                            ${account.currentDrawdown.toLocaleString()} / ${account.maxDrawdown.toLocaleString()}
                          </span>
                        </div>
                        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${drawdownPercent > 75 ? "bg-red-500" : drawdownPercent > 50 ? "bg-amber-500" : "bg-slate-500"}`}
                            style={{ width: `${drawdownPercent}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-700/50">
                      <div className="flex items-center gap-1.5 text-sm text-slate-400">
                        <Clock className="h-4 w-4" />
                        <span>{account.tradingDays}/{account.minTradingDays} trading days</span>
                      </div>
                      <div className="flex items-center text-sm text-slate-400 group-hover:text-emerald-400 transition-colors">
                        View details
                        <ArrowRight className="ml-1 h-4 w-4" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="relative bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-12 text-center">
            <div className="inline-flex p-4 rounded-2xl bg-slate-700/50 mb-4">
              <Wallet className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No accounts yet</h3>
            <p className="text-slate-400 mb-6">Get started by purchasing your first evaluation account</p>
            <Button asChild className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white border-0">
              <Link href="/accounts/purchase">
                <Plus className="mr-2 h-4 w-4" />
                Purchase Account
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-bold text-white mb-6">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {quickActions.map((action) => (
            <Link key={action.title} href={action.href} className="group">
              <div className="relative bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 hover:border-slate-600 transition-all duration-300 hover:scale-[1.02] overflow-hidden">
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${action.gradient} opacity-5 rounded-full blur-2xl group-hover:opacity-10 transition-opacity`} />
                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${action.gradient} mb-4`}>
                  <action.icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">{action.title}</h3>
                <p className="text-sm text-slate-400">{action.description}</p>
                <ArrowRight className="absolute bottom-6 right-6 h-5 w-5 text-slate-600 group-hover:text-slate-400 group-hover:translate-x-1 transition-all" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
