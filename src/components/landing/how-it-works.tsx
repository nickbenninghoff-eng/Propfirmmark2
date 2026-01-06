import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, Target, Wallet, Repeat, ArrowRight } from "lucide-react";

const steps = [
  {
    icon: ClipboardCheck,
    title: "Choose Your Account",
    description:
      "Select an account size that fits your trading style. Start with $25K up to $150K in buying power.",
    color: "from-blue-500 to-cyan-500",
    bgColor: "bg-blue-500/10",
  },
  {
    icon: Target,
    title: "Pass the Evaluation",
    description:
      "Hit your profit target while staying within the drawdown rules. No time limits - trade at your own pace.",
    color: "from-emerald-500 to-green-500",
    bgColor: "bg-emerald-500/10",
  },
  {
    icon: Wallet,
    title: "Get Funded",
    description:
      "Once you pass, receive your funded account. Trade with real capital and keep up to 80% of profits.",
    color: "from-violet-500 to-purple-500",
    bgColor: "bg-violet-500/10",
  },
  {
    icon: Repeat,
    title: "Request Payouts",
    description:
      "Withdraw your earnings weekly. We process payouts fast so you get paid when you need it.",
    color: "from-orange-500 to-amber-500",
    bgColor: "bg-orange-500/10",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 md:py-32 bg-slate-900 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-slate-900" />

      <div className="container relative z-10">
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-blue-500/10 text-blue-400 border-blue-500/20">
            Simple Process
          </Badge>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-white">
            How It{" "}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Works
            </span>
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Getting funded is simple. Follow these four steps and start trading with our capital.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {/* Connection line for desktop */}
          <div className="hidden lg:block absolute top-24 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-blue-500 via-emerald-500 via-violet-500 to-orange-500 opacity-30" />

          {steps.map((step, index) => (
            <div key={step.title} className="relative group">
              <div className="relative bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 h-full hover:border-slate-600 transition-all duration-300 hover:scale-[1.02]">
                {/* Step number */}
                <div className={`absolute -top-4 -left-4 w-10 h-10 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center font-bold text-white text-lg shadow-lg`}>
                  {index + 1}
                </div>

                {/* Icon */}
                <div className={`inline-flex p-4 rounded-2xl ${step.bgColor} mb-6`}>
                  <step.icon className={`w-8 h-8 bg-gradient-to-br ${step.color} bg-clip-text text-transparent`} style={{ color: 'currentColor' }} />
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                <p className="text-slate-400 leading-relaxed">{step.description}</p>

                {/* Arrow for desktop */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-slate-800 border border-slate-700 items-center justify-center">
                    <ArrowRight className="w-3 h-3 text-slate-500" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Mobile step connectors */}
        <div className="flex justify-center mt-8 lg:hidden">
          <div className="flex items-center gap-2">
            {steps.map((step, index) => (
              <div key={step.title} className="flex items-center">
                <div className={`w-3 h-3 rounded-full bg-gradient-to-br ${step.color}`} />
                {index < steps.length - 1 && (
                  <div className="w-8 h-0.5 bg-slate-700" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
