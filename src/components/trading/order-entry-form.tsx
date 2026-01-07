"use client";

import { useState } from "react";
import { useSubmitOrder, useMarketPrice } from "@/hooks/use-trading-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { TrendingUp, TrendingDown, Loader2 } from "lucide-react";

interface OrderEntryFormProps {
  accountId: string;
  symbol: string;
}

export default function OrderEntryForm({ accountId, symbol }: OrderEntryFormProps) {
  const [orderType, setOrderType] = useState<string>("market");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [quantity, setQuantity] = useState<string>("1");
  const [limitPrice, setLimitPrice] = useState<string>("");
  const [stopPrice, setStopPrice] = useState<string>("");
  const [trailAmount, setTrailAmount] = useState<string>("");
  const [timeInForce, setTimeInForce] = useState<string>("day");

  const submitOrderMutation = useSubmitOrder();
  const { data: priceData } = useMarketPrice(symbol);

  // Calculate bid/ask from current market price (spread = 1 tick)
  const currentPrice = priceData?.success ? Number(priceData.price) : null;
  const tickSize = 0.25; // Default tick size for ES/NQ
  const bid = currentPrice ? currentPrice - tickSize : null;
  const ask = currentPrice ? currentPrice + tickSize : null;

  const handleSetBid = () => {
    if (bid) {
      setLimitPrice(bid.toFixed(2));
      toast.info(`Limit price set to bid: $${bid.toFixed(2)}`);
    }
  };

  const handleSetAsk = () => {
    if (ask) {
      setLimitPrice(ask.toFixed(2));
      toast.info(`Limit price set to ask: $${ask.toFixed(2)}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Quantity must be a positive integer");
      return;
    }

    if ((orderType === "limit" || orderType === "stop_limit") && !limitPrice) {
      toast.error("Limit price is required for limit orders");
      return;
    }

    if ((orderType === "stop" || orderType === "stop_limit") && !stopPrice) {
      toast.error("Stop price is required for stop orders");
      return;
    }

    if (orderType === "trailing_stop" && !trailAmount) {
      toast.error("Trail amount is required for trailing stop orders");
      return;
    }

    try {
      const result = await submitOrderMutation.mutateAsync({
        accountId,
        symbol,
        orderType,
        side,
        quantity: qty,
        limitPrice: limitPrice ? parseFloat(limitPrice) : undefined,
        stopPrice: stopPrice ? parseFloat(stopPrice) : undefined,
        trailAmount: trailAmount ? parseFloat(trailAmount) : undefined,
        timeInForce,
      });

      if (result.success) {
        toast.success(`Order submitted successfully! Order ID: ${result.orderId}`);

        // Reset form for market orders (for quick re-entry)
        if (orderType === "market") {
          setQuantity("1");
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to submit order");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Order Type Selector */}
      <div>
        <Label className="mb-2 block text-sm font-medium text-white">Order Type</Label>
        <div className="grid grid-cols-3 gap-2 md:grid-cols-5">
          <button
            type="button"
            onClick={() => setOrderType("market")}
            className={`rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
              orderType === "market"
                ? "border-cyan-500/40 bg-gradient-to-r from-cyan-500/20 to-cyan-500/10 text-cyan-400"
                : "border-white/20 bg-white/5 text-white/60 hover:bg-white/10"
            }`}
          >
            Market
          </button>
          <button
            type="button"
            onClick={() => setOrderType("limit")}
            className={`rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
              orderType === "limit"
                ? "border-cyan-500/40 bg-gradient-to-r from-cyan-500/20 to-cyan-500/10 text-cyan-400"
                : "border-white/20 bg-white/5 text-white/60 hover:bg-white/10"
            }`}
          >
            Limit
          </button>
          <button
            type="button"
            onClick={() => setOrderType("stop")}
            className={`rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
              orderType === "stop"
                ? "border-cyan-500/40 bg-gradient-to-r from-cyan-500/20 to-cyan-500/10 text-cyan-400"
                : "border-white/20 bg-white/5 text-white/60 hover:bg-white/10"
            }`}
          >
            Stop
          </button>
          <button
            type="button"
            onClick={() => setOrderType("stop_limit")}
            className={`rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
              orderType === "stop_limit"
                ? "border-cyan-500/40 bg-gradient-to-r from-cyan-500/20 to-cyan-500/10 text-cyan-400"
                : "border-white/20 bg-white/5 text-white/60 hover:bg-white/10"
            }`}
          >
            Stop Limit
          </button>
          <button
            type="button"
            onClick={() => setOrderType("trailing_stop")}
            className={`col-span-3 rounded-lg border px-4 py-2 text-sm font-medium transition-all md:col-span-1 ${
              orderType === "trailing_stop"
                ? "border-cyan-500/40 bg-gradient-to-r from-cyan-500/20 to-cyan-500/10 text-cyan-400"
                : "border-white/20 bg-white/5 text-white/60 hover:bg-white/10"
            }`}
          >
            Trailing Stop
          </button>
        </div>
      </div>

      {/* Buy/Sell Buttons */}
      <div>
        <Label className="mb-2 block text-sm font-medium text-white">Side</Label>
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setSide("buy")}
            className={`flex items-center justify-center gap-2 rounded-lg border px-6 py-4 font-semibold transition-all ${
              side === "buy"
                ? "border-emerald-500/40 bg-gradient-to-r from-emerald-500/20 to-emerald-500/10 text-emerald-400 shadow-lg shadow-emerald-500/20"
                : "border-white/20 bg-white/5 text-white/60 hover:bg-white/10"
            }`}
          >
            <TrendingUp className="h-5 w-5" />
            BUY
          </button>
          <button
            type="button"
            onClick={() => setSide("sell")}
            className={`flex items-center justify-center gap-2 rounded-lg border px-6 py-4 font-semibold transition-all ${
              side === "sell"
                ? "border-rose-500/40 bg-gradient-to-r from-rose-500/20 to-rose-500/10 text-rose-400 shadow-lg shadow-rose-500/20"
                : "border-white/20 bg-white/5 text-white/60 hover:bg-white/10"
            }`}
          >
            <TrendingDown className="h-5 w-5" />
            SELL
          </button>
        </div>
      </div>

      {/* Quantity */}
      <div>
        <Label htmlFor="quantity" className="mb-2 block text-sm font-medium text-white">
          Quantity (Contracts)
        </Label>
        <Input
          id="quantity"
          type="number"
          min="1"
          step="1"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="border-white/20 bg-white/5 text-white placeholder:text-white/40 focus:border-cyan-500/40"
          placeholder="1"
        />
      </div>

      {/* Conditional Price Fields */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Limit Price */}
        {(orderType === "limit" || orderType === "stop_limit") && (
          <div>
            <Label htmlFor="limitPrice" className="mb-2 block text-sm font-medium text-white">
              Limit Price
            </Label>
            <div className="space-y-2">
              <Input
                id="limitPrice"
                type="number"
                step="0.01"
                value={limitPrice}
                onChange={(e) => setLimitPrice(e.target.value)}
                className="border-white/20 bg-white/5 text-white placeholder:text-white/40 focus:border-cyan-500/40"
                placeholder="0.00"
              />
              {/* Bid/Ask Quick Buttons */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSetBid}
                  disabled={!bid}
                  className="flex-1 rounded border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 transition-all hover:bg-emerald-500/20 disabled:opacity-50"
                >
                  Bid {bid ? `$${bid.toFixed(2)}` : ''}
                </button>
                <button
                  type="button"
                  onClick={handleSetAsk}
                  disabled={!ask}
                  className="flex-1 rounded border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-400 transition-all hover:bg-rose-500/20 disabled:opacity-50"
                >
                  Ask {ask ? `$${ask.toFixed(2)}` : ''}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stop Price */}
        {(orderType === "stop" || orderType === "stop_limit" || orderType === "trailing_stop") && (
          <div>
            <Label htmlFor="stopPrice" className="mb-2 block text-sm font-medium text-white">
              Stop Price
            </Label>
            <Input
              id="stopPrice"
              type="number"
              step="0.01"
              value={stopPrice}
              onChange={(e) => setStopPrice(e.target.value)}
              className="border-white/20 bg-white/5 text-white placeholder:text-white/40 focus:border-cyan-500/40"
              placeholder="0.00"
            />
          </div>
        )}

        {/* Trail Amount */}
        {orderType === "trailing_stop" && (
          <div>
            <Label htmlFor="trailAmount" className="mb-2 block text-sm font-medium text-white">
              Trail Amount
            </Label>
            <Input
              id="trailAmount"
              type="number"
              step="0.01"
              value={trailAmount}
              onChange={(e) => setTrailAmount(e.target.value)}
              className="border-white/20 bg-white/5 text-white placeholder:text-white/40 focus:border-cyan-500/40"
              placeholder="0.00"
            />
          </div>
        )}
      </div>

      {/* Time in Force */}
      <div>
        <Label htmlFor="timeInForce" className="mb-2 block text-sm font-medium text-white">
          Time in Force
        </Label>
        <select
          id="timeInForce"
          value={timeInForce}
          onChange={(e) => setTimeInForce(e.target.value)}
          className="w-full rounded-lg border border-white/20 bg-slate-800 px-4 py-2 text-white backdrop-blur-xl transition-all hover:bg-slate-700 focus:border-cyan-500/40 focus:outline-none"
        >
          <option value="day" className="bg-slate-800 text-white">Day (Good for Day)</option>
          <option value="gtc" className="bg-slate-800 text-white">GTC (Good Till Cancelled)</option>
          <option value="ioc" className="bg-slate-800 text-white">IOC (Immediate or Cancel)</option>
          <option value="fok" className="bg-slate-800 text-white">FOK (Fill or Kill)</option>
        </select>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={submitOrderMutation.isPending}
        className={`w-full cursor-pointer rounded-lg border px-6 py-4 font-semibold text-white transition-all duration-300 ${
          side === "buy"
            ? "border-emerald-500/40 bg-white/5 hover:scale-[1.02] hover:border-emerald-500/40 hover:bg-gradient-to-r hover:from-emerald-500/20 hover:to-cyan-500/20 hover:shadow-lg hover:shadow-emerald-500/20"
            : "border-rose-500/40 bg-white/5 hover:scale-[1.02] hover:border-rose-500/40 hover:bg-gradient-to-r hover:from-rose-500/20 hover:to-violet-500/20 hover:shadow-lg hover:shadow-rose-500/20"
        }`}
      >
        {submitOrderMutation.isPending ? (
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Submitting Order...
          </div>
        ) : (
          `Submit ${side.toUpperCase()} Order`
        )}
      </Button>

      {/* Order Type Description */}
      <div className="rounded-lg border border-white/10 bg-white/5 p-4">
        <div className="text-xs text-white/60">
          {orderType === "market" && "Market orders execute immediately at the best available price."}
          {orderType === "limit" && "Limit orders only execute at the specified price or better."}
          {orderType === "stop" && "Stop orders trigger a market order when the stop price is reached."}
          {orderType === "stop_limit" && "Stop-limit orders trigger a limit order when the stop price is reached."}
          {orderType === "trailing_stop" && "Trailing stop orders adjust the stop price as the market moves in your favor."}
        </div>
      </div>
    </form>
  );
}
