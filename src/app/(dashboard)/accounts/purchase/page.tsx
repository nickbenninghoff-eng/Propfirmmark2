import { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckoutButton } from "@/components/stripe/checkout-button";
import { db } from "@/lib/db";
import { accountTiers } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { CheckCircle, TrendingUp, Shield, Calendar, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Purchase Account",
  description: "Choose your evaluation account size",
};

const features = [
  "80% Profit Split",
  "No Time Limit",
  "Trailing Drawdown (EOD)",
  "Trade All Major Futures",
  "Weekly Payouts",
  "Real-Time Dashboard",
];

export default async function PurchaseAccountPage() {
  const tiers = await db.query.accountTiers.findMany({
    where: eq(accountTiers.isActive, true),
    orderBy: [asc(accountTiers.sortOrder)],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Purchase Account</h1>
        <p className="text-muted-foreground">
          Choose your evaluation account size and start trading
        </p>
      </div>

      {/* Tier Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {tiers.map((tier) => (
          <div
            key={tier.id}
            className={cn(
              "relative rounded-2xl border bg-gradient-to-br backdrop-blur-xl flex flex-col transition-all hover:shadow-lg",
              tier.isPopular
                ? "border-violet-500/40 from-violet-500/15 via-violet-500/8 to-cyan-500/8 shadow-lg ring-2 ring-violet-500/50"
                : "border-white/10 from-white/5 to-white/[0.02]"
            )}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent rounded-2xl" />

            {tier.isPopular && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-violet-500 hover:bg-violet-600 border-violet-500/50">
                Most Popular
              </Badge>
            )}

            <div className="relative p-6 flex flex-col flex-1 space-y-4">
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">{tier.displayName}</h3>
                <div>
                  <span className="text-3xl font-bold text-white">
                    ${tier.price}
                  </span>
                  <span className="text-white/60"> one-time</span>
                </div>
              </div>

              <div className="flex-1 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Account Size</span>
                  <span className="font-medium text-white">
                    ${Number(tier.accountSize).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Profit Target</span>
                  <span className="font-medium text-emerald-400">
                    ${Number(tier.profitTarget).toLocaleString()} ({tier.profitTargetPercent}%)
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Max Drawdown</span>
                  <span className="font-medium text-rose-400">
                    ${Number(tier.maxDrawdown).toLocaleString()} ({tier.maxDrawdownPercent}%)
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Daily Loss Limit</span>
                  <span className="font-medium text-white">
                    ${Number(tier.dailyLossLimit).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Min Trading Days</span>
                  <span className="font-medium text-white">{tier.minTradingDays} days</span>
                </div>
              </div>

              <div className="pt-4">
                <CheckoutButton
                  tierId={tier.id}
                  tierName={tier.displayName}
                  price={tier.price}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {tiers.length === 0 && (
        <div className="relative rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl p-12">
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent rounded-2xl" />
          <div className="relative text-center text-white/60">
            No active tiers available at the moment. Please check back later.
          </div>
        </div>
      )}

      {/* Features */}
      <div className="relative rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-cyan-500/5 backdrop-blur-xl p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent rounded-2xl" />
        <div className="relative">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-1">All Accounts Include</h3>
            <p className="text-sm text-white/60">
              Every evaluation account comes with these features
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div key={feature} className="flex items-center gap-2">
                <Check className="h-5 w-5 text-emerald-400" />
                <span className="text-white">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Rules Summary */}
      <div className="relative rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 via-cyan-500/5 to-violet-500/5 backdrop-blur-xl p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent rounded-2xl" />
        <div className="relative">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-1">Evaluation Rules</h3>
            <p className="text-sm text-white/60">
              Simple rules to help you succeed
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-medium text-white mb-2">Profit Target</h4>
              <p className="text-sm text-white/60">
                Reach your profit target to pass the evaluation.
                There's no time limit - trade at your own pace.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-white mb-2">Trailing Drawdown</h4>
              <p className="text-sm text-white/60">
                Your drawdown trails with your end-of-day balance. It stops trailing
                once you hit your profit target.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-white mb-2">Daily Loss Limit</h4>
              <p className="text-sm text-white/60">
                Don't lose more than the daily limit in a single trading day.
                This resets at market close each day.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-white mb-2">Minimum Trading Days</h4>
              <p className="text-sm text-white/60">
                Trade for the minimum required days before you can pass. A trading day counts
                when you make at least one trade.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
