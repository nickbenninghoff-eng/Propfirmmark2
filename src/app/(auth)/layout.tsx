import Link from "next/link";
import { TrendingUp, Quote, CheckCircle2 } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex bg-slate-950">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-900/30" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20" />
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-emerald-500/20 via-transparent to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-cyan-500/20 via-transparent to-transparent rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 shadow-lg shadow-emerald-500/25">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <div>
              <span className="text-2xl font-bold text-white">PropFirm</span>
              <p className="text-xs text-slate-400">Trading Platform</p>
            </div>
          </Link>

          <div className="space-y-8">
            <div className="bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8">
              <Quote className="h-10 w-10 text-emerald-400/50 mb-4" />
              <blockquote className="space-y-4">
                <p className="text-xl font-medium leading-relaxed text-white">
                  &ldquo;I passed my evaluation in just 2 weeks and got funded the same day.
                  Now I&apos;m trading with $100K of their capital and keeping 80% of my profits.&rdquo;
                </p>
                <footer className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-white font-bold">
                    JR
                  </div>
                  <div>
                    <cite className="not-italic font-medium text-white">James R.</cite>
                    <p className="text-sm text-slate-400">Funded Trader</p>
                  </div>
                </footer>
              </blockquote>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {[
                { value: "$5M+", label: "Paid to Traders" },
                { value: "10K+", label: "Funded Traders" },
                { value: "80%", label: "Profit Split" },
              ].map((stat) => (
                <div key={stat.label} className="bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                  <div className="text-sm text-slate-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            {["No time limits", "Same-day funding", "Weekly payouts"].map((feature) => (
              <div key={feature} className="flex items-center gap-2 text-sm text-slate-400">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                {feature}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - Auth form */}
      <div className="flex-1 flex items-center justify-center p-8 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-800 via-slate-950 to-slate-950" />

        <div className="w-full max-w-md relative z-10">
          {/* Mobile logo */}
          <Link href="/" className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">PropFirm</span>
          </Link>
          {children}
        </div>
      </div>
    </div>
  );
}
