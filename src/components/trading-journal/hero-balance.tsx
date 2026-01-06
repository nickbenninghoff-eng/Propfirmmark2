"use client";

import { TrendingUp, TrendingDown, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface HeroBalanceProps {
  currentBalance: number;
  initialBalance: number;
  accountNumber: string;
  status: "active" | "funded" | "passed" | "failed";
}

export function HeroBalance({
  currentBalance,
  initialBalance,
  accountNumber,
  status,
}: HeroBalanceProps) {
  const pnl = currentBalance - initialBalance;
  const pnlPercent = ((pnl / initialBalance) * 100).toFixed(2);
  const isProfit = pnl >= 0;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/5">
      {/* Holographic gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-cyan-500/5 to-violet-500/10" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

      {/* Animated grid overlay */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px]" />
      </div>

      {/* Content */}
      <div className="relative backdrop-blur-xl p-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex items-center gap-3 mb-2"
            >
              <span className="font-mono text-sm text-white/60 tracking-wider">
                {accountNumber}
              </span>
              <div className={cn(
                "px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm border",
                status === "funded" && "bg-emerald-500/20 border-emerald-500/30 text-emerald-400",
                status === "active" && "bg-cyan-500/20 border-cyan-500/30 text-cyan-400",
                status === "passed" && "bg-violet-500/20 border-violet-500/30 text-violet-400",
                status === "failed" && "bg-rose-500/20 border-rose-500/30 text-rose-400"
              )}>
                <div className="flex items-center gap-1.5">
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full animate-pulse",
                    status === "funded" && "bg-emerald-400",
                    status === "active" && "bg-cyan-400",
                    status === "passed" && "bg-violet-400",
                    status === "failed" && "bg-rose-400"
                  )} />
                  {status.toUpperCase()}
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mb-2"
            >
              <div className="text-sm font-medium text-white/40 mb-1 tracking-wide">
                CURRENT BALANCE
              </div>
              <div className="text-6xl font-bold tracking-tight bg-gradient-to-br from-white via-white to-white/80 bg-clip-text text-transparent">
                ${currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </motion.div>
          </div>

          {/* P&L Indicator with glow */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="relative"
          >
            {/* Glow effect */}
            <div className={cn(
              "absolute inset-0 blur-2xl opacity-60 rounded-2xl",
              isProfit ? "bg-emerald-500" : "bg-rose-500"
            )} />

            <div className={cn(
              "relative px-6 py-4 rounded-2xl border backdrop-blur-xl",
              isProfit
                ? "bg-emerald-500/10 border-emerald-500/20"
                : "bg-rose-500/10 border-rose-500/20"
            )}>
              <div className="flex items-center gap-3">
                {isProfit ? (
                  <TrendingUp className="w-8 h-8 text-emerald-400" />
                ) : (
                  <TrendingDown className="w-8 h-8 text-rose-400" />
                )}
                <div>
                  <div className={cn(
                    "text-3xl font-bold font-mono",
                    isProfit ? "text-emerald-400" : "text-rose-400"
                  )}>
                    {isProfit ? "+" : ""}{pnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className={cn(
                    "text-lg font-medium",
                    isProfit ? "text-emerald-400/70" : "text-rose-400/70"
                  )}>
                    {isProfit ? "+" : ""}{pnlPercent}%
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Profit streak indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex items-center gap-2 text-sm"
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="text-white/60">From ${initialBalance.toLocaleString()}</span>
          <span className="text-white/40">•</span>
          <span className="text-amber-400/80">High Water Mark</span>
        </motion.div>
      </div>
    </div>
  );
}
