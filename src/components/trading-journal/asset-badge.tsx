"use client";

import { Bitcoin, TrendingUp, Briefcase, DollarSign, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AssetBadgeProps {
  type: "stock" | "option" | "futures" | "forex" | "crypto";
  symbol: string;
  size?: "sm" | "md" | "lg";
}

const assetConfig = {
  stock: {
    icon: TrendingUp,
    label: "Stock",
    color: "blue",
    classes: "bg-blue-500/15 border-blue-500/30 text-blue-400",
    glowClasses: "group-hover:shadow-blue-500/50",
  },
  option: {
    icon: Briefcase,
    label: "Option",
    color: "purple",
    classes: "bg-purple-500/15 border-purple-500/30 text-purple-400",
    glowClasses: "group-hover:shadow-purple-500/50",
  },
  futures: {
    icon: BarChart3,
    label: "Futures",
    color: "orange",
    classes: "bg-orange-500/15 border-orange-500/30 text-orange-400",
    glowClasses: "group-hover:shadow-orange-500/50",
  },
  forex: {
    icon: DollarSign,
    label: "Forex",
    color: "green",
    classes: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400",
    glowClasses: "group-hover:shadow-emerald-500/50",
  },
  crypto: {
    icon: Bitcoin,
    label: "Crypto",
    color: "amber",
    classes: "bg-amber-500/15 border-amber-500/30 text-amber-400",
    glowClasses: "group-hover:shadow-amber-500/50",
  },
};

export function AssetBadge({ type, symbol, size = "md" }: AssetBadgeProps) {
  const config = assetConfig[type];
  const Icon = config.icon;

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs gap-1",
    md: "px-3 py-1 text-sm gap-1.5",
    lg: "px-4 py-1.5 text-base gap-2",
  };

  return (
    <div className="group relative inline-flex">
      {/* Glow effect */}
      <div className={cn(
        "absolute -inset-0.5 rounded-lg opacity-0 group-hover:opacity-100 blur-md transition-all duration-300",
        config.glowClasses
      )} />

      <div className={cn(
        "relative flex items-center rounded-lg border backdrop-blur-sm font-medium transition-all duration-200",
        config.classes,
        sizeClasses[size]
      )}>
        <Icon className={cn(
          size === "sm" && "w-3 h-3",
          size === "md" && "w-3.5 h-3.5",
          size === "lg" && "w-4 h-4"
        )} />
        <span className="font-mono font-bold">{symbol}</span>
      </div>
    </div>
  );
}
