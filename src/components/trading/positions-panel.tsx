"use client";

import { usePositions, useClosePosition } from "@/hooks/use-trading-data";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { TrendingUp, TrendingDown, X, Loader2 } from "lucide-react";
import { useState } from "react";

interface PositionsPanelProps {
  accountId: string;
}

export default function PositionsPanel({ accountId }: PositionsPanelProps) {
  const { data: positionsData, isLoading } = usePositions(accountId);
  const closePositionMutation = useClosePosition();
  const [closingSymbol, setClosingSymbol] = useState<string | null>(null);

  const handleClosePosition = async (symbol: string) => {
    if (!confirm(`Are you sure you want to close your position in ${symbol}?`)) {
      return;
    }

    try {
      setClosingSymbol(symbol);
      await closePositionMutation.mutateAsync({ accountId, symbol });
      toast.success(`Position in ${symbol} closed successfully`);
    } catch (error: any) {
      toast.error(error.message || "Failed to close position");
    } finally {
      setClosingSymbol(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-white/60">Loading positions...</div>
      </div>
    );
  }

  if (!positionsData?.success) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-rose-500">Failed to load positions</div>
      </div>
    );
  }

  const positions = positionsData.positions || [];
  const summary = positionsData.summary || {};

  if (positions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="mb-2 text-2xl">📊</div>
        <div className="text-white/60">No open positions</div>
        <div className="mt-1 text-sm text-white/40">Submit an order to open a position</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <div className="mb-1 text-xs uppercase tracking-wider text-white/50">Total Positions</div>
          <div className="font-mono text-xl font-bold text-white">{summary.totalPositions}</div>
        </div>
        <div className="rounded-lg border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 p-4">
          <div className="mb-1 text-xs uppercase tracking-wider text-white/50">Unrealized P&L</div>
          <div className={`font-mono text-xl font-bold ${Number(summary.totalUnrealizedPnl) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            ${Number(summary.totalUnrealizedPnl || 0).toFixed(2)}
          </div>
        </div>
        <div className="rounded-lg border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 p-4">
          <div className="mb-1 text-xs uppercase tracking-wider text-white/50">Total P&L</div>
          <div className={`font-mono text-xl font-bold ${Number(summary.totalPnl) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            ${Number(summary.totalPnl || 0).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Positions Table */}
      <div className="overflow-hidden rounded-lg border border-white/10">
        <table className="w-full">
          <thead className="border-b border-white/10 bg-white/5">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/70">Symbol</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/70">Side</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-white/70">Quantity</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-white/70">Entry Price</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-white/70">Current Price</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-white/70">Unrealized P&L</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-white/70">P&L %</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-white/70">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {positions.map((position: any) => {
              const isLong = position.quantity > 0;
              const unrealizedPnl = Number(position.unrealizedPnl || 0);
              const isProfitable = unrealizedPnl >= 0;
              const pnlPercentage = (unrealizedPnl / (Math.abs(position.quantity) * Number(position.avgEntryPrice))) * 100;

              return (
                <tr key={position.id} className="hover:bg-white/5">
                  <td className="px-4 py-3 font-mono text-sm font-medium text-white">{position.symbol}</td>
                  <td className="px-4 py-3">
                    <div className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold ${isLong ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>
                      {isLong ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {isLong ? "LONG" : "SHORT"}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-white">{Math.abs(position.quantity)}</td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-white">${Number(position.avgEntryPrice).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-white">${Number(position.currentPrice).toFixed(2)}</td>
                  <td className={`px-4 py-3 text-right font-mono text-sm font-semibold ${isProfitable ? "text-emerald-400" : "text-rose-400"}`}>
                    {isProfitable ? "+" : ""}${unrealizedPnl.toFixed(2)}
                  </td>
                  <td className={`px-4 py-3 text-right font-mono text-sm font-semibold ${isProfitable ? "text-emerald-400" : "text-rose-400"}`}>
                    {isProfitable ? "+" : ""}{pnlPercentage.toFixed(2)}%
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Button
                      onClick={() => handleClosePosition(position.symbol)}
                      disabled={closingSymbol === position.symbol}
                      size="sm"
                      variant="ghost"
                      className="hover:bg-rose-500/20 hover:text-rose-400"
                    >
                      {closingSymbol === position.symbol ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Help Text */}
      <div className="rounded-lg border border-white/10 bg-white/5 p-4">
        <div className="text-xs text-white/60">
          Positions update in real-time based on current market prices. Click the X button to close a position at market price.
        </div>
      </div>
    </div>
  );
}
