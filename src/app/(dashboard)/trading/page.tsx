import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { tradingAccounts } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import { LineChart, TrendingUp, ArrowRight } from "lucide-react";

export default async function TradingPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Fetch user's trading accounts
  const accounts = await db.query.tradingAccounts.findMany({
    where: eq(tradingAccounts.userId, session.user.id),
    with: {
      tier: true,
    },
    orderBy: [desc(tradingAccounts.createdAt)],
  });

  // Filter for active accounts (evaluation or funded)
  const activeAccounts = accounts.filter(
    (acc) =>
      acc.status === "active" ||
      acc.status === "evaluation" ||
      acc.status === "passed"
  );

  // Auto-redirect to first active account
  if (activeAccounts.length > 0) {
    redirect(`/trading/${activeAccounts[0].id}`);
  }

  // No active accounts - show message
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        <div className="rounded-2xl border border-white/20 bg-gradient-to-br from-white/10 to-white/5 p-12 text-center backdrop-blur-xl">
          <div className="mb-6 flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 shadow-lg shadow-amber-500/20">
              <LineChart className="h-10 w-10 text-amber-400" />
            </div>
          </div>

          <h1 className="mb-4 text-3xl font-bold text-white">No Active Trading Accounts</h1>
          <p className="mb-8 text-white/60">
            You don't have any active evaluation or funded accounts yet.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/accounts"
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-6 py-3 text-sm font-medium text-white transition-all hover:bg-white/10"
            >
              <TrendingUp className="h-4 w-4" />
              View My Accounts
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href="/accounts/purchase"
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 px-6 py-3 text-sm font-medium text-white transition-all hover:scale-105 hover:shadow-lg hover:shadow-emerald-500/20"
            >
              Purchase Account
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {accounts.length > 0 && (
            <div className="mt-8 rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-400">
              You have {accounts.length} account(s), but none are currently active for trading.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
