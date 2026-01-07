"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useCallback, useEffect } from "react";
import { useAccountSummary, useSubmitOrder, useClosePosition, useCancelOrder, usePositions, useOrders } from "@/hooks/use-trading-data";
import { useOrderMonitor } from "@/hooks/use-order-monitor";
import { useTradingShortcuts } from "@/hooks/use-trading-shortcuts";
import { useSession } from "next-auth/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import dynamic from "next/dynamic";

// Dynamically import components to avoid SSR issues with charts
const OrderEntryForm = dynamic(() => import("@/components/trading/order-entry-form"), { ssr: false });
const PositionsPanel = dynamic(() => import("@/components/trading/positions-panel"), { ssr: false });
const OpenOrdersPanel = dynamic(() => import("@/components/trading/open-orders-panel"), { ssr: false });
const TradingChart = dynamic(() => import("@/components/trading/trading-chart"), { ssr: false });
const QuickOrderButtons = dynamic(() => import("@/components/trading/quick-order-buttons"), { ssr: false });
const PositionSizeCalculator = dynamic(() => import("@/components/trading/position-size-calculator"), { ssr: false });
const QuantitySelector = dynamic(() => import("@/components/trading/quantity-selector"), { ssr: false });

export default function TradingPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const accountId = params.accountId as string;
  const [selectedSymbol, setSelectedSymbol] = useState("ESH25");
  const [selectedQuantity, setSelectedQuantity] = useState<number>(0);
  const [userAccounts, setUserAccounts] = useState<any[]>([]);

  const { data: summaryData, isLoading: summaryLoading } = useAccountSummary(accountId);
  const submitOrderMutation = useSubmitOrder();
  const closePositionMutation = useClosePosition();
  const cancelOrderMutation = useCancelOrder();
  const { data: positionsData } = usePositions(accountId);
  const { data: ordersData } = useOrders(accountId, "pending,submitted,working,partial");

  // Enable background order monitoring (every 5 seconds)
  useOrderMonitor(accountId, true);

  // Fetch user's accounts for account selector
  useEffect(() => {
    async function fetchAccounts() {
      if (!session?.user?.id) return;

      try {
        const res = await fetch(`/api/users/${session.user.id}/accounts`);
        const data = await res.json();

        if (data.success) {
          // Filter for active accounts
          const activeAccounts = data.accounts.filter(
            (acc: any) =>
              acc.status === "active" ||
              acc.status === "evaluation" ||
              acc.status === "passed"
          );
          setUserAccounts(activeAccounts);
        }
      } catch (error) {
        console.error("Error fetching accounts:", error);
      }
    }

    fetchAccounts();
  }, [session]);

  // Keyboard shortcut handlers
  const handleQuickBuy = useCallback(async () => {
    try {
      await submitOrderMutation.mutateAsync({
        accountId,
        symbol: selectedSymbol,
        orderType: "market",
        side: "buy",
        quantity: 1,
        timeInForce: "ioc",
      });
      toast.success("Quick buy order submitted!");
    } catch (error: any) {
      toast.error(error.message || "Failed to submit buy order");
    }
  }, [accountId, selectedSymbol, submitOrderMutation]);

  const handleQuickSell = useCallback(async () => {
    try {
      await submitOrderMutation.mutateAsync({
        accountId,
        symbol: selectedSymbol,
        orderType: "market",
        side: "sell",
        quantity: 1,
        timeInForce: "ioc",
      });
      toast.success("Quick sell order submitted!");
    } catch (error: any) {
      toast.error(error.message || "Failed to submit sell order");
    }
  }, [accountId, selectedSymbol, submitOrderMutation]);

  const handleCloseAllPositions = useCallback(async () => {
    if (!positionsData?.success || positionsData.positions.length === 0) {
      toast.error("No open positions to close");
      return;
    }

    if (!confirm(`Close all ${positionsData.positions.length} position(s)?`)) {
      return;
    }

    try {
      for (const position of positionsData.positions) {
        await closePositionMutation.mutateAsync({
          accountId,
          symbol: position.symbol,
        });
      }
      toast.success("All positions closed successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to close all positions");
    }
  }, [accountId, positionsData, closePositionMutation]);

  const handleFlatten = useCallback(async () => {
    const hasPositions = positionsData?.success && positionsData.positions.length > 0;
    const hasOrders = ordersData?.success && ordersData.orders.length > 0;

    if (!hasPositions && !hasOrders) {
      toast.error("No positions or orders to flatten");
      return;
    }

    if (!confirm("Flatten account? This will cancel all orders and close all positions.")) {
      return;
    }

    try {
      if (hasOrders) {
        for (const order of ordersData.orders) {
          await cancelOrderMutation.mutateAsync({ orderId: order.id, accountId });
        }
      }

      if (hasPositions) {
        for (const position of positionsData.positions) {
          await closePositionMutation.mutateAsync({ accountId, symbol: position.symbol });
        }
      }

      toast.success("Account flattened successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to flatten account");
    }
  }, [accountId, positionsData, ordersData, closePositionMutation, cancelOrderMutation]);

  // Enable keyboard shortcuts
  useTradingShortcuts({
    onQuickBuy: handleQuickBuy,
    onQuickSell: handleQuickSell,
    onCloseAllPositions: handleCloseAllPositions,
    onFlatten: handleFlatten,
    enabled: true,
  });

  if (summaryLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-white/60">Loading trading interface...</div>
      </div>
    );
  }

  if (!summaryData?.success) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-rose-500">Failed to load account data</div>
      </div>
    );
  }

  const { account, margin, positions, orders, ruleCompliance } = summaryData;

  const equity = Number(account.equity);
  const dailyPnl = Number(account.dailyPnl);
  const isDailyProfit = dailyPnl >= 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/20 bg-white/5 backdrop-blur-xl transition-all hover:bg-white/10"
          >
            <ArrowLeft className="h-5 w-5 text-white" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Trading Interface</h1>
            <p className="text-sm text-white/50">
              {account.isSimulated ? "Simulated" : "Live"} Trading
            </p>
          </div>
        </div>

        {/* Account & Symbol Selectors */}
        <div className="flex items-center gap-4">
          {/* Account Selector */}
          {userAccounts.length > 0 && (
            <select
              value={accountId}
              onChange={(e) => router.push(`/trading/${e.target.value}`)}
              className="rounded-lg border border-white/20 bg-slate-800 px-4 py-2 text-white backdrop-blur-xl transition-all hover:bg-slate-700 focus:border-cyan-500/40 focus:outline-none"
            >
              {userAccounts.map((acc) => (
                <option key={acc.id} value={acc.id} className="bg-slate-800 text-white">
                  {acc.tier?.name || 'Account'} - ${Number(acc.currentBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </option>
              ))}
            </select>
          )}

          {/* Symbol Selector */}
          <select
            value={selectedSymbol}
            onChange={(e) => setSelectedSymbol(e.target.value)}
            className="rounded-lg border border-white/20 bg-slate-800 px-4 py-2 text-white backdrop-blur-xl transition-all hover:bg-slate-700 focus:border-cyan-500/40 focus:outline-none"
          >
            <option value="ESH25" className="bg-slate-800 text-white">ES (E-mini S&P 500)</option>
            <option value="NQH25" className="bg-slate-800 text-white">NQ (E-mini Nasdaq)</option>
            <option value="YMH25" className="bg-slate-800 text-white">YM (E-mini Dow)</option>
            <option value="CLH25" className="bg-slate-800 text-white">CL (Crude Oil)</option>
            <option value="GCJ25" className="bg-slate-800 text-white">GC (Gold)</option>
          </select>
        </div>
      </div>

      {/* Account Summary Bar */}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {/* Balance */}
        <div className="relative rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 p-4 backdrop-blur-xl">
          <div className="mb-1 text-xs uppercase tracking-wider text-white/50">Balance</div>
          <div className="font-mono text-2xl font-bold text-white">
            ${Number(account.currentBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Daily P&L */}
        <div className={`relative rounded-xl border ${isDailyProfit ? "border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5" : "border-rose-500/20 bg-gradient-to-br from-rose-500/10 to-rose-500/5"} p-4 backdrop-blur-xl`}>
          <div className="mb-1 text-xs uppercase tracking-wider text-white/50">Daily P&L</div>
          <div className={`flex items-center gap-2 font-mono text-2xl font-bold ${isDailyProfit ? "text-emerald-400" : "text-rose-400"}`}>
            {isDailyProfit ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
            {isDailyProfit ? "+" : "-"}${Math.abs(dailyPnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Open P&L */}
        <div className={`relative rounded-xl border ${positions.totalUnrealizedPnl >= 0 ? "border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-cyan-500/5" : "border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-amber-500/5"} p-4 backdrop-blur-xl`}>
          <div className="mb-1 text-xs uppercase tracking-wider text-white/50">Open P&L</div>
          <div className={`flex items-center gap-2 font-mono text-2xl font-bold ${positions.totalUnrealizedPnl >= 0 ? "text-cyan-400" : "text-amber-400"}`}>
            {positions.totalUnrealizedPnl >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
            {positions.totalUnrealizedPnl >= 0 ? "+" : "-"}${Math.abs(positions.totalUnrealizedPnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Margin Usage */}
        <div className="relative rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 to-violet-500/5 p-4 backdrop-blur-xl">
          <div className="mb-1 text-xs uppercase tracking-wider text-white/50">Margin Usage</div>
          <div className="font-mono text-2xl font-bold text-white">
            {Number(margin.marginUtilization).toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Chart Area */}
      <div className="mb-6 rounded-2xl border border-white/20 bg-gradient-to-br from-white/10 to-white/5 p-6 backdrop-blur-xl">
        <TradingChart symbol={selectedSymbol} accountId={accountId} />
      </div>

      {/* Tabs for Order Entry, Positions, Orders */}
      <div className="rounded-2xl border border-white/20 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl">
        <Tabs defaultValue="order-entry" className="w-full">
          <TabsList className="grid w-full grid-cols-4 border-b border-white/10 bg-transparent p-0">
            <TabsTrigger
              value="order-entry"
              className="rounded-none border-b-2 border-transparent py-4 text-white/60 transition-colors hover:text-white data-[state=active]:border-cyan-500 data-[state=active]:bg-transparent data-[state=active]:text-cyan-400"
            >
              Order Entry
            </TabsTrigger>
            <TabsTrigger
              value="positions"
              className="rounded-none border-b-2 border-transparent py-4 text-white/60 transition-colors hover:text-white data-[state=active]:border-emerald-500 data-[state=active]:bg-transparent data-[state=active]:text-emerald-400"
            >
              Positions ({positions.count})
            </TabsTrigger>
            <TabsTrigger
              value="orders"
              className="rounded-none border-b-2 border-transparent py-4 text-white/60 transition-colors hover:text-white data-[state=active]:border-violet-500 data-[state=active]:bg-transparent data-[state=active]:text-violet-400"
            >
              Orders ({orders.count})
            </TabsTrigger>
            <TabsTrigger
              value="calculator"
              className="rounded-none border-b-2 border-transparent py-4 text-white/60 transition-colors hover:text-white data-[state=active]:border-amber-500 data-[state=active]:bg-transparent data-[state=active]:text-amber-400"
            >
              Calculator
            </TabsTrigger>
          </TabsList>

          <TabsContent value="order-entry" className="p-6">
            <OrderEntryForm accountId={accountId} symbol={selectedSymbol} />
          </TabsContent>

          <TabsContent value="positions" className="p-6">
            <PositionsPanel accountId={accountId} />
          </TabsContent>

          <TabsContent value="orders" className="p-6">
            <OpenOrdersPanel accountId={accountId} />
          </TabsContent>

          <TabsContent value="calculator" className="p-6">
            <PositionSizeCalculator accountId={accountId} symbol={selectedSymbol} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Quantity Selector (Floating) */}
      <QuantitySelector onQuantityChange={setSelectedQuantity} />

      {/* Quick Order Buttons (Floating) */}
      <QuickOrderButtons accountId={accountId} symbol={selectedSymbol} defaultQuantity={selectedQuantity} />

      {/* Rule Compliance Warning */}
      {(ruleCompliance.drawdown.status === "warning" || ruleCompliance.dailyLoss.status === "warning") && (
        <div className="mt-6 rounded-xl border border-amber-500/40 bg-gradient-to-br from-amber-500/20 to-amber-500/10 p-4 backdrop-blur-xl">
          <div className="font-semibold text-amber-400">⚠️ Rule Compliance Warning</div>
          <div className="mt-2 text-sm text-white/80">
            {ruleCompliance.drawdown.status === "warning" && (
              <div>Drawdown: {ruleCompliance.drawdown.percentage.toFixed(1)}% of limit</div>
            )}
            {ruleCompliance.dailyLoss.status === "warning" && (
              <div>Daily Loss: {ruleCompliance.dailyLoss.percentage.toFixed(1)}% of limit</div>
            )}
          </div>
        </div>
      )}

      {/* Account Disabled Warning */}
      {(account.status === "failed" || account.dailyLossLimitHit) && (
        <div className="mt-6 rounded-xl border border-rose-500/40 bg-gradient-to-br from-rose-500/20 to-rose-500/10 p-4 backdrop-blur-xl">
          <div className="font-semibold text-rose-400">🚫 Trading Disabled</div>
          <div className="mt-2 text-sm text-white/80">
            {account.status === "failed" && <div>Account Failed: {account.failureReason}</div>}
            {account.dailyLossLimitHit && <div>Daily loss limit has been hit. Trading will resume tomorrow.</div>}
          </div>
        </div>
      )}
    </div>
  );
}
