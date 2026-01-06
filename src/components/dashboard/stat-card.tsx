import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  className,
}: StatCardProps) {
  return (
    <div className={cn("relative rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl overflow-hidden", className)}>
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent" />
      <div className="relative p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-white/50 uppercase tracking-wider">
            {title}
          </h3>
          {Icon && (
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
              <Icon className="h-4 w-4 text-white/60" />
            </div>
          )}
        </div>
        <div className="text-3xl font-bold font-mono text-white mb-1">{value}</div>
        {(description || trend) && (
          <p className="text-xs text-white/60 mt-1">
            {trend && (
              <span
                className={cn(
                  "font-medium mr-1",
                  trend.isPositive ? "text-emerald-400" : "text-rose-400"
                )}
              >
                {trend.isPositive ? "+" : "-"}
                {Math.abs(trend.value)}%
              </span>
            )}
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
