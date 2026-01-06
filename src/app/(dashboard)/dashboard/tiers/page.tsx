import { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckoutButton } from "@/components/stripe/checkout-button";
import { db } from "@/lib/db";
import { accountTiers } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { CheckCircle, TrendingUp, Shield, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Account Tiers",
  description: "Choose your trading account tier",
};

export default async function TiersPage() {
  const tiers = await db.query.accountTiers.findMany({
    where: eq(accountTiers.isActive, true),
    orderBy: [asc(accountTiers.sortOrder)],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Account Tiers</h1>
        <p className="text-muted-foreground">
          Choose the perfect account size for your trading journey
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {tiers.map((tier) => (
          <Card
            key={tier.id}
            className={cn(
              "relative overflow-hidden transition-all hover:shadow-lg",
              tier.isPopular && "border-primary shadow-md"
            )}
          >
            {tier.isPopular && (
              <div className="absolute top-0 right-0">
                <Badge className="rounded-none rounded-bl-lg">Most Popular</Badge>
              </div>
            )}

            <CardHeader>
              <CardTitle className="text-2xl">{tier.displayName}</CardTitle>
              <CardDescription>{tier.description}</CardDescription>
              <div className="mt-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold">
                    ${Number(tier.accountSize).toLocaleString()}
                  </span>
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-semibold text-primary">
                    ${tier.price}
                  </span>
                  <span className="text-sm text-muted-foreground ml-2">one-time</span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Key Features */}
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <TrendingUp className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Profit Target</p>
                    <p className="text-sm text-muted-foreground">
                      ${Number(tier.profitTarget).toLocaleString()} ({tier.profitTargetPercent}%)
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-red-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Max Drawdown</p>
                    <p className="text-sm text-muted-foreground">
                      ${Number(tier.maxDrawdown).toLocaleString()} ({tier.maxDrawdownPercent}%)
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-orange-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Daily Loss Limit</p>
                    <p className="text-sm text-muted-foreground">
                      ${Number(tier.dailyLossLimit).toLocaleString()} ({tier.dailyLossLimitPercent}%)
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Minimum Trading Days</p>
                    <p className="text-sm text-muted-foreground">
                      {tier.minTradingDays} days required
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-purple-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Profit Split</p>
                    <p className="text-sm text-muted-foreground">
                      {tier.profitSplit}% to you
                    </p>
                  </div>
                </div>
              </div>

              {/* Additional Info */}
              <div className="pt-4 border-t space-y-2">
                <p className="text-sm">
                  <span className="font-medium">Drawdown Type:</span>{" "}
                  <span className="text-muted-foreground capitalize">
                    {tier.drawdownType.replace(/_/g, " ")}
                  </span>
                </p>
                <p className="text-sm">
                  <span className="font-medium">Payout Frequency:</span>{" "}
                  <span className="text-muted-foreground capitalize">
                    {tier.payoutFrequency}
                  </span>
                </p>
                <p className="text-sm">
                  <span className="font-medium">Min Payout:</span>{" "}
                  <span className="text-muted-foreground">
                    ${Number(tier.minPayoutAmount).toLocaleString()}
                  </span>
                </p>
                {tier.resetPrice && (
                  <p className="text-sm">
                    <span className="font-medium">Reset Price:</span>{" "}
                    <span className="text-muted-foreground">
                      ${tier.resetPrice}
                    </span>
                  </p>
                )}
              </div>

              {/* Purchase Button */}
              <div className="pt-4">
                <CheckoutButton
                  tierId={tier.id}
                  tierName={tier.displayName}
                  price={tier.price}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {tiers.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No active tiers available at the moment. Please check back later.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
