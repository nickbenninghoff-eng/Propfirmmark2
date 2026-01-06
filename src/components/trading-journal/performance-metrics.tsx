"use client";

import { motion } from "framer-motion";
import { TrendingUp, Target, BarChart3, Award } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
  icon: React.ElementType;
  delay: number;
  color: "emerald" | "cyan" | "violet" | "amber";
}

function MetricCard({ title, value, subtitle, trend, icon: Icon, delay, color }: MetricCardProps) {
  const colorClasses = {
    emerald: {
      bg: "from-emerald-500/10 to-emerald-500/5",
      border: "border-emerald-500/20",
      glow: "bg-emerald-500/40",
      text: "text-emerald-400",
      icon: "text-emerald-400",
    },
    cyan: {
      bg: "from-cyan-500/10 to-cyan-500/5",
      border: "border-cyan-500/20",
      glow: "bg-cyan-500/40",
      text: "text-cyan-400",
      icon: "text-cyan-400",
    },
    violet: {
      bg: "from-violet-500/10 to-violet-500/5",
      border: "border-violet-500/20",
      glow: "bg-violet-500/40",
      text: "text-violet-400",
      icon: "text-violet-400",
    },
    amber: {
      bg: "from-amber-500/10 to-amber-500/5",
      border: "border-amber-500/20",
      glow: "bg-amber-500/40",
      text: "text-amber-400",
      icon: "text-amber-400",
    },
  };

  const colors = colorClasses[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="group relative"
    >
      {/* Glow effect on hover */}
      <div className={cn(
        "absolute -inset-0.5 rounded-2xl opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500",
        colors.glow
      )} />

      <div className={cn(
        "relative rounded-2xl border backdrop-blur-xl p-6 bg-gradient-to-br",
        colors.bg,
        colors.border
      )}>
        <div className="flex items-start justify-between mb-4">
          <div className={cn("p-2.5 rounded-xl bg-white/5 border border-white/10", colors.icon)}>
            <Icon className="w-5 h-5" />
          </div>
          {trend && (
            <div className={cn(
              "text-xs font-medium px-2 py-1 rounded-full",
              trend === "up" && "bg-emerald-500/20 text-emerald-400",
              trend === "down" && "bg-rose-500/20 text-rose-400",
              trend === "neutral" && "bg-white/10 text-white/60"
            )}>
              {trend === "up" && "↑"}
              {trend === "down" && "↓"}
              {trend === "neutral" && "→"}
            </div>
          )}
        </div>

        <div>
          <div className="text-sm font-medium text-white/50 mb-1 uppercase tracking-wider">
            {title}
          </div>
          <div className={cn("text-3xl font-bold font-mono mb-1", colors.text)}>
            {value}
          </div>
          {subtitle && (
            <div className="text-xs text-white/40">
              {subtitle}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

interface PerformanceMetricsProps {
  sharpeRatio: number;
  profitFactor: number;
  winRate: number;
  avgWinLoss: string;
}

export function PerformanceMetrics({
  sharpeRatio,
  profitFactor,
  winRate,
  avgWinLoss,
}: PerformanceMetricsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        title="Sharpe Ratio"
        value={sharpeRatio.toFixed(2)}
        subtitle="Risk-adjusted returns"
        trend={sharpeRatio > 1 ? "up" : sharpeRatio < 0.5 ? "down" : "neutral"}
        icon={TrendingUp}
        color="emerald"
        delay={0.5}
      />
      <MetricCard
        title="Profit Factor"
        value={profitFactor.toFixed(2)}
        subtitle="Gross profit / Gross loss"
        trend={profitFactor > 1.5 ? "up" : profitFactor < 1 ? "down" : "neutral"}
        icon={Target}
        color="cyan"
        delay={0.6}
      />
      <MetricCard
        title="Win Rate"
        value={`${winRate.toFixed(1)}%`}
        subtitle="Winning trades ratio"
        trend={winRate > 55 ? "up" : winRate < 45 ? "down" : "neutral"}
        icon={BarChart3}
        color="violet"
        delay={0.7}
      />
      <MetricCard
        title="Avg Win/Loss"
        value={avgWinLoss}
        subtitle="Average winner vs loser"
        icon={Award}
        color="amber"
        delay={0.8}
      />
    </div>
  );
}
