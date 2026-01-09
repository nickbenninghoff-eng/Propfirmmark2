"use client";

import { useState } from "react";
import { useSubmitOrder, useClosePosition, useCancelOrder, usePositions, useOrders, useMarketPrice } from "@/hooks/use-trading-data";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { TrendingUp, TrendingDown, X, Loader2, ArrowUp, ArrowDown, Ban } from "lucide-react";

interface QuickOrderButtonsProps {
  accountId: string;
  symbol: string;
  defaultQuantity?: number;
}

export default function QuickOrderButtons({ accountId, symbol, defaultQuantity = 1 }: QuickOrderButtonsProps) {
  const submitOrderMutation = useSubmitOrder();
  const closePositionMutation = useClosePosition();
  const cancelOrderMutation = useCancelOrder();
  const { data: positionsData } = usePositions(accountId);
  const { data: ordersData } = useOrders(accountId, "working,submitted,partial");
  const { data: priceData } = useMarketPrice(symbol);

  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Calculate bid/ask from current market price
  const currentPrice = priceData?.success ? Number(priceData.price) : null;
  const tickSize = 0.25;
  const bid = currentPrice ? currentPrice - tickSize : null;
  const ask = currentPrice ? currentPrice + tickSize : null;

  const handleQuickBuy = async () => {
    const qty = defaultQuantity > 0 ? defaultQuantity : 1;

    try {
      setActionInProgress("buy");
      const result = await submitOrderMutation.mutateAsync({
        accountId,
        symbol,
        orderType: "market",
        side: "buy",
        quantity: qty,
        timeInForce: "ioc",
      });

      if (result.success) {
        toast.success("Quick buy order submitted!");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to submit buy order");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleQuickSell = async () => {
    const qty = defaultQuantity > 0 ? defaultQuantity : 1;

    try {
      setActionInProgress("sell");
      const result = await submitOrderMutation.mutateAsync({
        accountId,
        symbol,
        orderType: "market",
        side: "sell",
        quantity: qty,
        timeInForce: "ioc",
      });

      if (result.success) {
        toast.success("Quick sell order submitted!");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to submit sell order");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleCancelAllOrders = async () => {
    if (!ordersData?.success || ordersData.orders.length === 0) {
      toast.error("No open orders to cancel");
      return;
    }

    if (!confirm(`Cancel all ${ordersData.orders.length} order(s)?`)) {
      return;
    }

    try {
      setActionInProgress("cancel-all");

      for (const order of ordersData.orders) {
        await cancelOrderMutation.mutateAsync({
          orderId: order.id,
          accountId,
        });
      }

      toast.success("All orders cancelled successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to cancel all orders");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleFlatten = async () => {
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
      setActionInProgress("flatten");

      // Cancel all orders first
      if (hasOrders) {
        for (const order of ordersData.orders) {
          await cancelOrderMutation.mutateAsync({
            orderId: order.id,
            accountId,
          });
        }
      }

      // Close all positions
      if (hasPositions) {
        for (const position of positionsData.positions) {
          await closePositionMutation.mutateAsync({
            accountId,
            symbol: position.symbol,
          });
        }
      }

      toast.success("Account flattened successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to flatten account");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleBuyBid = async () => {
    if (!bid) {
      toast.error("Price data not available");
      return;
    }

    const qty = defaultQuantity > 0 ? defaultQuantity : 1;

    try {
      setActionInProgress("buy-bid");
      const result = await submitOrderMutation.mutateAsync({
        accountId,
        symbol,
        orderType: "limit",
        side: "buy",
        quantity: qty,
        limitPrice: bid,
        timeInForce: "day",
      });

      if (result.success) {
        toast.success(`Buy limit order placed @ $${bid.toFixed(2)}`);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to submit buy limit order");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleSellAsk = async () => {
    if (!ask) {
      toast.error("Price data not available");
      return;
    }

    const qty = defaultQuantity > 0 ? defaultQuantity : 1;

    try {
      setActionInProgress("sell-ask");
      const result = await submitOrderMutation.mutateAsync({
        accountId,
        symbol,
        orderType: "limit",
        side: "sell",
        quantity: qty,
        limitPrice: ask,
        timeInForce: "day",
      });

      if (result.success) {
        toast.success(`Sell limit order placed @ $${ask.toFixed(2)}`);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to submit sell limit order");
    } finally {
      setActionInProgress(null);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 grid grid-cols-2 gap-3">
      {/* Row 1: Buy @ Bid, Sell @ Ask */}
      <Button
        onClick={handleBuyBid}
        disabled={actionInProgress !== null || !bid}
        className="group relative h-14 w-14 cursor-pointer rounded-full border border-cyan-500/40 bg-gradient-to-br from-cyan-500/20 to-cyan-500/10 p-0 shadow-lg shadow-cyan-500/20 backdrop-blur-xl transition-all duration-300 hover:scale-110 hover:shadow-xl hover:shadow-cyan-500/40"
        title={`Buy Limit @ Bid ${bid ? `($${bid.toFixed(2)})` : ''}`}
      >
        {actionInProgress === "buy-bid" ? (
          <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
        ) : (
          <ArrowUp className="h-6 w-6 text-cyan-400" />
        )}
        <span className="absolute right-full mr-3 hidden whitespace-nowrap rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-400 backdrop-blur-xl group-hover:block">
          Buy @ Bid {bid ? `$${bid.toFixed(2)}` : ''}
        </span>
      </Button>

      <Button
        onClick={handleSellAsk}
        disabled={actionInProgress !== null || !ask}
        className="group relative h-14 w-14 cursor-pointer rounded-full border border-violet-500/40 bg-gradient-to-br from-violet-500/20 to-violet-500/10 p-0 shadow-lg shadow-violet-500/20 backdrop-blur-xl transition-all duration-300 hover:scale-110 hover:shadow-xl hover:shadow-violet-500/40"
        title={`Sell Limit @ Ask ${ask ? `($${ask.toFixed(2)})` : ''}`}
      >
        {actionInProgress === "sell-ask" ? (
          <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
        ) : (
          <ArrowDown className="h-6 w-6 text-violet-400" />
        )}
        <span className="absolute right-full mr-3 hidden whitespace-nowrap rounded-lg border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-400 backdrop-blur-xl group-hover:block">
          Sell @ Ask {ask ? `$${ask.toFixed(2)}` : ''}
        </span>
      </Button>

      {/* Row 2: Buy @ Market, Sell @ Market */}
      <Button
        onClick={handleQuickBuy}
        disabled={actionInProgress !== null}
        className="group relative h-14 w-14 cursor-pointer rounded-full border border-emerald-500/40 bg-gradient-to-br from-emerald-500/20 to-emerald-500/10 p-0 shadow-lg shadow-emerald-500/20 backdrop-blur-xl transition-all duration-300 hover:scale-110 hover:shadow-xl hover:shadow-emerald-500/40"
        title="Buy Market"
      >
        {actionInProgress === "buy" ? (
          <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
        ) : (
          <TrendingUp className="h-6 w-6 text-emerald-400" />
        )}
        <span className="absolute right-full mr-3 hidden whitespace-nowrap rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400 backdrop-blur-xl group-hover:block">
          Buy Market
        </span>
      </Button>

      <Button
        onClick={handleQuickSell}
        disabled={actionInProgress !== null}
        className="group relative h-14 w-14 cursor-pointer rounded-full border border-rose-500/40 bg-gradient-to-br from-rose-500/20 to-rose-500/10 p-0 shadow-lg shadow-rose-500/20 backdrop-blur-xl transition-all duration-300 hover:scale-110 hover:shadow-xl hover:shadow-rose-500/40"
        title="Sell Market"
      >
        {actionInProgress === "sell" ? (
          <Loader2 className="h-6 w-6 animate-spin text-rose-400" />
        ) : (
          <TrendingDown className="h-6 w-6 text-rose-400" />
        )}
        <span className="absolute right-full mr-3 hidden whitespace-nowrap rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-xs font-medium text-rose-400 backdrop-blur-xl group-hover:block">
          Sell Market
        </span>
      </Button>

      {/* Row 3: Cancel All Orders, Flatten Account */}
      <Button
        onClick={handleCancelAllOrders}
        disabled={actionInProgress !== null}
        className="group relative h-14 w-14 cursor-pointer rounded-full border border-amber-500/40 bg-gradient-to-br from-amber-500/20 to-amber-500/10 p-0 shadow-lg shadow-amber-500/20 backdrop-blur-xl transition-all duration-300 hover:scale-110 hover:shadow-xl hover:shadow-amber-500/40"
        title="Cancel All Orders"
      >
        {actionInProgress === "cancel-all" ? (
          <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
        ) : (
          <Ban className="h-6 w-6 text-amber-400" />
        )}
        <span className="absolute right-full mr-3 hidden whitespace-nowrap rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400 backdrop-blur-xl group-hover:block">
          Cancel All Orders
        </span>
      </Button>

      <Button
        onClick={handleFlatten}
        disabled={actionInProgress !== null}
        className="group relative h-14 w-14 cursor-pointer rounded-full border border-red-500/40 bg-gradient-to-br from-red-500/20 to-red-500/10 p-0 shadow-lg shadow-red-500/20 backdrop-blur-xl transition-all duration-300 hover:scale-110 hover:shadow-xl hover:shadow-red-500/40"
        title="Flatten Account (Cancel all orders + Close all positions)"
      >
        {actionInProgress === "flatten" ? (
          <Loader2 className="h-6 w-6 animate-spin text-red-400" />
        ) : (
          <div className="flex flex-col items-center justify-center">
            <X className="h-4 w-4 text-red-400" />
            <X className="h-4 w-4 text-red-400" />
          </div>
        )}
        <span className="absolute right-full mr-3 hidden whitespace-nowrap rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-400 backdrop-blur-xl group-hover:block">
          Flatten Account
        </span>
      </Button>
    </div>
  );
}
