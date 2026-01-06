import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface AccountCardProps {
  account: {
    id: string;
    accountNumber: string | null;
    status: string;
    phase: string;
    currentBalance: number;
    initialBalance: number;
    profitTarget: number;
    maxDrawdown: number;
    currentDrawdown: number;
    tier: {
      displayName: string;
      accountSize: number;
    };
  };
}

const statusColors: Record<string, string> = {
  active: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  passed: "bg-violet-500/10 text-violet-500 border-violet-500/20",
  funded: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  failed: "bg-rose-500/10 text-rose-500 border-rose-500/20",
  pending_payment: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  pending_activation: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  suspended: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  expired: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
};

const statusLabels: Record<string, string> = {
  active: "Active",
  passed: "Passed",
  funded: "Funded",
  failed: "Failed",
  pending_payment: "Pending Payment",
  pending_activation: "Pending Activation",
  suspended: "Suspended",
  expired: "Expired",
};

// Card border colors based on status
const cardBorderColors: Record<string, string> = {
  active: "border-cyan-500/20",
  passed: "border-violet-500/20",
  funded: "border-emerald-500/20",
  failed: "border-rose-500/20",
  pending_payment: "border-amber-500/20",
  pending_activation: "border-orange-500/20",
  suspended: "border-white/5",
  expired: "border-white/5",
};

// Card gradient backgrounds based on status
const cardGradients: Record<string, string> = {
  active: "from-cyan-500/10 via-cyan-500/5 to-violet-500/5",
  passed: "from-violet-500/10 via-violet-500/5 to-cyan-500/5",
  funded: "from-emerald-500/10 via-emerald-500/5 to-cyan-500/5",
  failed: "from-rose-500/10 via-rose-500/5 to-orange-500/5",
  pending_payment: "from-amber-500/10 via-amber-500/5 to-orange-500/5",
  pending_activation: "from-orange-500/10 via-orange-500/5 to-amber-500/5",
  suspended: "from-white/5 to-white/[0.02]",
  expired: "from-white/5 to-white/[0.02]",
};

export function AccountCard({ account }: AccountCardProps) {
  const pnl = account.currentBalance - account.initialBalance;
  const pnlPercent = (pnl / account.initialBalance) * 100;
  const isProfit = pnl >= 0;

  const profitProgress = Math.min(
    (pnl / account.profitTarget) * 100,
    100
  );
  const drawdownUsed = (account.currentDrawdown / account.maxDrawdown) * 100;

  return (
    <div className={cn(
      "relative rounded-2xl border bg-gradient-to-br backdrop-blur-xl overflow-hidden",
      cardBorderColors[account.status] || "border-white/5",
      cardGradients[account.status] || "from-white/5 to-white/[0.02]"
    )}>
      {/* Layered gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent" />

      {/* Content */}
      <div className="relative p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">
              {account.tier.displayName}
            </h3>
            <p className="text-sm text-white/60">
              {account.accountNumber || "Pending..."}
            </p>
          </div>
          <Badge
            variant="outline"
            className={cn(statusColors[account.status])}
          >
            {statusLabels[account.status] || account.status}
          </Badge>
        </div>

        {/* Balance and P/L */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white/60">Current Balance</p>
            <p className="text-2xl font-bold text-white">
              ${account.currentBalance.toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-white/60">P/L</p>
            <div className={cn(
              "flex items-center gap-1 text-lg font-semibold",
              isProfit ? "text-emerald-400" : "text-rose-400"
            )}>
              {isProfit ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span>
                {isProfit ? "+" : ""}${pnl.toLocaleString()} ({pnlPercent.toFixed(2)}%)
              </span>
            </div>
          </div>
        </div>

        {/* Profit Target Progress */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-white/60">Profit Target</span>
            <span className="text-white/80">
              ${Math.max(0, pnl).toLocaleString()} / ${account.profitTarget.toLocaleString()}
            </span>
          </div>
          <Progress
            value={Math.max(0, profitProgress)}
            className="h-2 bg-white/10 [&>div]:bg-gradient-to-r [&>div]:from-emerald-500 [&>div]:to-cyan-500"
          />
        </div>

        {/* Drawdown */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-white/60">Drawdown Used</span>
            <span className={cn(
              "text-white/80",
              drawdownUsed > 80 && "text-rose-400"
            )}>
              ${account.currentDrawdown.toLocaleString()} / ${account.maxDrawdown.toLocaleString()}
            </span>
          </div>
          <Progress
            value={drawdownUsed}
            className={cn(
              "h-2 bg-white/10",
              drawdownUsed > 80
                ? "[&>div]:bg-rose-500"
                : "[&>div]:bg-gradient-to-r [&>div]:from-amber-500 [&>div]:to-orange-500"
            )}
          />
        </div>

        {/* Footer Button */}
        <Button variant="outline" className="w-full mt-4 border-white/20 bg-white/5 hover:bg-gradient-to-r hover:from-emerald-500/20 hover:to-cyan-500/20 hover:border-emerald-500/40 hover:scale-[1.02] text-white hover:text-white transition-all duration-300" asChild>
          <Link href={`/accounts/${account.id}`}>
            View Details
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
