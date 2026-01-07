"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMarketPrice, useAccountSummary } from "@/hooks/use-trading-data";
import { Calculator } from "lucide-react";

interface PositionSizeCalculatorProps {
  accountId: string;
  symbol: string;
}

// Contract multipliers (point value)
const CONTRACT_MULTIPLIERS: Record<string, number> = {
  ES: 50,   // $50 per point
  NQ: 20,   // $20 per point
  YM: 5,    // $5 per point
  CL: 1000, // $1000 per point
  GC: 100,  // $100 per point
};

// Margin requirements per contract
const MARGIN_REQUIREMENTS: Record<string, number> = {
  ES: 500,
  NQ: 500,
  YM: 500,
  CL: 1000,
  GC: 1000,
};

export default function PositionSizeCalculator({ accountId, symbol }: PositionSizeCalculatorProps) {
  const { data: summaryData } = useAccountSummary(accountId);
  const { data: priceData } = useMarketPrice(symbol);

  const [riskAmount, setRiskAmount] = useState<string>("100");
  const [riskPercentage, setRiskPercentage] = useState<string>("1");
  const [stopLossPoints, setStopLossPoints] = useState<string>("5");
  const [usePercentage, setUsePercentage] = useState<boolean>(false);

  const baseSymbol = symbol.substring(0, 2).toUpperCase();
  const multiplier = CONTRACT_MULTIPLIERS[baseSymbol] || 50;
  const marginPerContract = MARGIN_REQUIREMENTS[baseSymbol] || 1000;

  const accountBalance = summaryData?.account?.currentBalance || 0;
  const currentPrice = priceData?.price || 0;

  // Calculate risk amount based on percentage if selected
  const calculatedRiskAmount = usePercentage
    ? (Number(riskPercentage) / 100) * Number(accountBalance)
    : Number(riskAmount);

  // Calculate recommended contracts
  const stopLossPointsNum = Number(stopLossPoints);
  const riskPerContract = stopLossPointsNum * multiplier;
  const recommendedContracts = riskPerContract > 0
    ? Math.floor(calculatedRiskAmount / riskPerContract)
    : 0;

  // Calculate total margin requirement
  const totalMargin = recommendedContracts * marginPerContract;

  // Calculate max loss if stopped out
  const maxLoss = recommendedContracts * riskPerContract;

  // Calculate risk/reward for 1:2 ratio
  const targetPoints = stopLossPointsNum * 2;
  const potentialProfit = recommendedContracts * targetPoints * multiplier;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Calculator className="h-5 w-5 text-cyan-400" />
        <h3 className="text-lg font-semibold text-white">Position Size Calculator</h3>
      </div>

      <div className="rounded-lg border border-white/10 bg-white/5 p-4">
        <div className="mb-4 text-xs text-white/60">
          Calculate optimal position size based on risk tolerance
        </div>

        {/* Account Balance Display */}
        <div className="mb-4 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3">
          <div className="text-xs text-white/50">Account Balance</div>
          <div className="font-mono text-xl font-bold text-emerald-400">
            ${Number(accountBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Current Price Display */}
        <div className="mb-4 rounded-lg border border-cyan-500/20 bg-cyan-500/10 p-3">
          <div className="text-xs text-white/50">Current {baseSymbol} Price</div>
          <div className="font-mono text-xl font-bold text-cyan-400">
            ${Number(currentPrice).toFixed(2)}
          </div>
        </div>

        {/* Risk Amount Selection */}
        <div className="mb-4">
          <Label className="mb-2 block text-sm font-medium text-white">Risk Method</Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setUsePercentage(false)}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                !usePercentage
                  ? "border-cyan-500/40 bg-gradient-to-r from-cyan-500/20 to-cyan-500/10 text-cyan-400"
                  : "border-white/20 bg-white/5 text-white/60 hover:bg-white/10"
              }`}
            >
              Dollar Amount
            </button>
            <button
              type="button"
              onClick={() => setUsePercentage(true)}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                usePercentage
                  ? "border-cyan-500/40 bg-gradient-to-r from-cyan-500/20 to-cyan-500/10 text-cyan-400"
                  : "border-white/20 bg-white/5 text-white/60 hover:bg-white/10"
              }`}
            >
              Percentage
            </button>
          </div>
        </div>

        {/* Risk Amount Input */}
        {!usePercentage ? (
          <div className="mb-4">
            <Label htmlFor="riskAmount" className="mb-2 block text-sm font-medium text-white">
              Risk Amount ($)
            </Label>
            <Input
              id="riskAmount"
              type="number"
              step="0.01"
              value={riskAmount}
              onChange={(e) => setRiskAmount(e.target.value)}
              className="border-white/20 bg-white/5 text-white placeholder:text-white/40 focus:border-cyan-500/40"
              placeholder="100.00"
            />
          </div>
        ) : (
          <div className="mb-4">
            <Label htmlFor="riskPercentage" className="mb-2 block text-sm font-medium text-white">
              Risk Percentage (%)
            </Label>
            <Input
              id="riskPercentage"
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={riskPercentage}
              onChange={(e) => setRiskPercentage(e.target.value)}
              className="border-white/20 bg-white/5 text-white placeholder:text-white/40 focus:border-cyan-500/40"
              placeholder="1.0"
            />
            <div className="mt-1 text-xs text-white/50">
              = ${calculatedRiskAmount.toFixed(2)}
            </div>
          </div>
        )}

        {/* Stop Loss Distance */}
        <div className="mb-4">
          <Label htmlFor="stopLossPoints" className="mb-2 block text-sm font-medium text-white">
            Stop Loss Distance (Points)
          </Label>
          <Input
            id="stopLossPoints"
            type="number"
            step="0.25"
            value={stopLossPoints}
            onChange={(e) => setStopLossPoints(e.target.value)}
            className="border-white/20 bg-white/5 text-white placeholder:text-white/40 focus:border-cyan-500/40"
            placeholder="5.00"
          />
          <div className="mt-1 text-xs text-white/50">
            1 point = ${multiplier} for {baseSymbol}
          </div>
        </div>

        {/* Results */}
        <div className="space-y-3 rounded-lg border border-violet-500/20 bg-violet-500/10 p-4">
          <div className="text-sm font-semibold text-violet-400">Calculation Results</div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-white/50">Recommended Contracts</div>
              <div className="font-mono text-2xl font-bold text-white">{recommendedContracts}</div>
            </div>
            <div>
              <div className="text-xs text-white/50">Margin Required</div>
              <div className="font-mono text-lg font-semibold text-white">${totalMargin.toLocaleString()}</div>
            </div>
          </div>

          <div className="border-t border-white/10 pt-3">
            <div className="text-xs text-white/50">Max Loss (if stopped out)</div>
            <div className="font-mono text-lg font-semibold text-rose-400">-${maxLoss.toFixed(2)}</div>
          </div>

          <div className="border-t border-white/10 pt-3">
            <div className="text-xs text-white/50">Potential Profit (2:1 R/R at {targetPoints.toFixed(2)} pts)</div>
            <div className="font-mono text-lg font-semibold text-emerald-400">+${potentialProfit.toFixed(2)}</div>
          </div>

          <div className="border-t border-white/10 pt-3">
            <div className="text-xs text-white/50">Risk/Reward Ratio</div>
            <div className="font-mono text-lg font-semibold text-cyan-400">1:2</div>
          </div>
        </div>

        {/* Warning if insufficient margin */}
        {totalMargin > Number(accountBalance) && (
          <div className="mt-4 rounded-lg border border-rose-500/40 bg-rose-500/20 p-3 text-xs text-rose-400">
            ⚠️ Warning: Required margin (${totalMargin.toLocaleString()}) exceeds account balance
          </div>
        )}
      </div>
    </div>
  );
}
