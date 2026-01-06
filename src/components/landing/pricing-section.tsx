import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, ArrowRight, Target, TrendingDown, AlertTriangle } from "lucide-react";

const tiers = [
  {
    name: "$25K",
    subtitle: "Starter",
    price: 149,
    accountSize: 25000,
    profitTarget: 1500,
    profitPercent: 6,
    maxDrawdown: 1500,
    dailyLossLimit: 500,
    popular: false,
    gradient: "from-slate-600 to-slate-700",
    accent: "emerald",
  },
  {
    name: "$50K",
    subtitle: "Popular",
    price: 249,
    accountSize: 50000,
    profitTarget: 3000,
    profitPercent: 6,
    maxDrawdown: 2500,
    dailyLossLimit: 1000,
    popular: true,
    gradient: "from-emerald-500 to-cyan-500",
    accent: "white",
  },
  {
    name: "$100K",
    subtitle: "Professional",
    price: 349,
    accountSize: 100000,
    profitTarget: 6000,
    profitPercent: 6,
    maxDrawdown: 3000,
    dailyLossLimit: 2000,
    popular: false,
    gradient: "from-slate-600 to-slate-700",
    accent: "emerald",
  },
  {
    name: "$150K",
    subtitle: "Elite",
    price: 449,
    accountSize: 150000,
    profitTarget: 9000,
    profitPercent: 6,
    maxDrawdown: 4500,
    dailyLossLimit: 3000,
    popular: false,
    gradient: "from-violet-600 to-purple-600",
    accent: "violet",
  },
];

const allFeatures = [
  { text: "80% Profit Split", highlight: true },
  { text: "No Time Limit", highlight: true },
  { text: "Trailing Drawdown (EOD)", highlight: false },
  { text: "Trade All Major Futures", highlight: false },
  { text: "5 Minimum Trading Days", highlight: false },
  { text: "Weekly Payouts", highlight: true },
  { text: "Real-Time Statistics", highlight: false },
  { text: "24/7 Support", highlight: false },
];

export function PricingSection() {
  return (
    <section id="pricing" className="py-24 md:py-32 bg-slate-950 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />

      <div className="container relative z-10">
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
            Simple Pricing
          </Badge>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-white">
            Choose Your{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              Account Size
            </span>
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            One payment, no hidden fees. All accounts share the same rules and{" "}
            <span className="text-emerald-400 font-semibold">80% profit split</span>.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative group ${tier.popular ? "lg:-mt-4 lg:mb-4" : ""}`}
            >
              {tier.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
                  <Badge className="bg-gradient-to-r from-emerald-500 to-cyan-500 text-white border-0 px-4 py-1 shadow-lg shadow-emerald-500/25">
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                    Most Popular
                  </Badge>
                </div>
              )}

              <div
                className={`relative h-full rounded-2xl overflow-hidden transition-all duration-300 ${
                  tier.popular
                    ? "bg-gradient-to-b from-emerald-500/20 to-cyan-500/20 p-[1px]"
                    : "bg-slate-800/50 border border-slate-700/50 hover:border-slate-600"
                }`}
              >
                <div className={`h-full rounded-2xl ${tier.popular ? "bg-slate-900" : ""} p-6`}>
                  {/* Header */}
                  <div className="mb-6">
                    <p className="text-sm text-slate-400 mb-1">{tier.subtitle}</p>
                    <h3 className="text-3xl font-bold text-white mb-2">{tier.name}</h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-white">${tier.price}</span>
                      <span className="text-slate-400">one-time</span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="space-y-3 mb-6 pb-6 border-b border-slate-700/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-slate-400">
                        <Target className="h-4 w-4 text-emerald-400" />
                        <span className="text-sm">Profit Target</span>
                      </div>
                      <span className="font-semibold text-emerald-400">
                        ${tier.profitTarget.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-slate-400">
                        <TrendingDown className="h-4 w-4 text-red-400" />
                        <span className="text-sm">Max Drawdown</span>
                      </div>
                      <span className="font-semibold text-red-400">
                        ${tier.maxDrawdown.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-slate-400">
                        <AlertTriangle className="h-4 w-4 text-amber-400" />
                        <span className="text-sm">Daily Limit</span>
                      </div>
                      <span className="font-semibold text-amber-400">
                        ${tier.dailyLossLimit.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Features preview */}
                  <ul className="space-y-2.5 mb-6">
                    {allFeatures.slice(0, 4).map((feature) => (
                      <li key={feature.text} className="flex items-center gap-2.5 text-sm text-slate-300">
                        <div className={`flex-shrink-0 w-5 h-5 rounded-full ${tier.popular ? "bg-emerald-500/20" : "bg-slate-700"} flex items-center justify-center`}>
                          <Check className={`h-3 w-3 ${tier.popular ? "text-emerald-400" : "text-slate-400"}`} />
                        </div>
                        <span>{feature.text}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  <Button
                    className={`w-full py-6 text-base font-semibold transition-all duration-300 ${
                      tier.popular
                        ? "bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white shadow-lg shadow-emerald-500/25"
                        : "bg-slate-700 hover:bg-slate-600 text-white border-0"
                    }`}
                    asChild
                  >
                    <Link href={`/register?tier=${tier.accountSize}`}>
                      Get Started
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* All features grid */}
        <div className="bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 md:p-12">
          <h3 className="text-2xl font-bold text-white text-center mb-8">
            Everything Included in All Accounts
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {allFeatures.map((feature) => (
              <div
                key={feature.text}
                className={`flex items-center gap-3 p-4 rounded-xl ${
                  feature.highlight
                    ? "bg-emerald-500/10 border border-emerald-500/20"
                    : "bg-slate-800/50"
                }`}
              >
                <div className={`flex-shrink-0 w-8 h-8 rounded-lg ${feature.highlight ? "bg-emerald-500/20" : "bg-slate-700"} flex items-center justify-center`}>
                  <Check className={`h-4 w-4 ${feature.highlight ? "text-emerald-400" : "text-slate-400"}`} />
                </div>
                <span className={`text-sm font-medium ${feature.highlight ? "text-emerald-300" : "text-slate-300"}`}>
                  {feature.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
