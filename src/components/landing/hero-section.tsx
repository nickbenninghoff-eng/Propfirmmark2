import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, CheckCircle2, TrendingUp, Shield, DollarSign, Zap, BarChart3, Clock } from "lucide-react";

const features = [
  { icon: Clock, text: "No time limit on evaluations" },
  { icon: BarChart3, text: "Trade major futures markets" },
  { icon: DollarSign, text: "80% profit split" },
  { icon: Zap, text: "Same-day payouts available" },
];

const stats = [
  { icon: DollarSign, value: "$5M+", label: "Paid to Traders", color: "from-emerald-500 to-green-500" },
  { icon: TrendingUp, value: "10K+", label: "Funded Traders", color: "from-blue-500 to-cyan-500" },
  { icon: Shield, value: "80%", label: "Profit Split", color: "from-violet-500 to-purple-500" },
  { icon: CheckCircle2, value: "24h", label: "Fast Payouts", color: "from-orange-500 to-amber-500" },
];

export function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Animated background effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-emerald-500/20 via-transparent to-transparent rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-blue-500/20 via-transparent to-transparent rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]" />

      <div className="container relative z-10 py-20 md:py-32">
        <div className="mx-auto max-w-5xl text-center">
          <Badge className="mb-6 bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20 px-4 py-1.5 text-sm font-medium">
            <Zap className="w-3.5 h-3.5 mr-1.5 inline" />
            Now offering instant funding
          </Badge>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-8 text-white">
            Get Funded to Trade
            <span className="block mt-2 bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
              Futures Markets
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-slate-400 max-w-3xl mx-auto mb-10 leading-relaxed">
            Pass our simple evaluation and trade with up to{" "}
            <span className="text-white font-semibold">$150,000</span> of our capital.
            Keep up to <span className="text-emerald-400 font-semibold">80%</span> of your profits with no personal risk.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Button size="lg" asChild className="text-lg px-8 py-6 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white shadow-lg shadow-emerald-500/25 border-0">
              <Link href="/#pricing">
                Start Trading Today
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="text-lg px-8 py-6 border-slate-700 bg-slate-800/50 text-white hover:bg-slate-800 hover:border-slate-600 backdrop-blur-sm">
              <Link href="/#how-it-works">
                Learn How It Works
              </Link>
            </Button>
          </div>

          <div className="flex flex-wrap justify-center gap-6 mb-20">
            {features.map((feature) => (
              <div key={feature.text} className="flex items-center gap-2.5 text-sm text-slate-300 bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-full px-4 py-2">
                <feature.icon className="h-4 w-4 text-emerald-400" />
                <span>{feature.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 max-w-5xl mx-auto">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="group relative bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 md:p-8 hover:border-slate-600 transition-all duration-300 hover:scale-[1.02]"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity duration-300`} />
              <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${stat.color} mb-4`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
              <div className="text-3xl md:text-4xl font-bold text-white mb-1">{stat.value}</div>
              <div className="text-sm text-slate-400">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-950 to-transparent" />
    </section>
  );
}
