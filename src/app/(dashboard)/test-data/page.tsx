"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TradeChart } from "@/components/trading-journal/trade-chart";
import { Loader2 } from "lucide-react";

export default function TestDataPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [showChart, setShowChart] = useState(false);

  const testCandles = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/mock-data/candles?symbol=ES&count=78");
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: String(error) });
    }
    setLoading(false);
  };

  const testTrades = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/mock-data/trades?symbol=ES&count=5");
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: String(error) });
    }
    setLoading(false);
  };

  const showSampleChart = () => {
    setShowChart(!showChart);
  };

  const regenerateTrades = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/regenerate-trades", {
        method: "POST",
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: String(error) });
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Test Mock Data Generator</h1>
        <p className="text-white/60">
          Test the realistic market data generator
        </p>
      </div>

      {/* Action Buttons */}
      <div className="relative rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-violet-500/5 to-cyan-500/5 backdrop-blur-xl p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent rounded-2xl" />
        <div className="relative space-y-4">
          <h3 className="text-lg font-semibold text-white mb-4">Test Actions</h3>

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={testCandles}
              disabled={loading}
              className="border-white/20 bg-white/5 hover:bg-gradient-to-r hover:from-emerald-500/20 hover:to-cyan-500/20 hover:border-emerald-500/40 hover:scale-[1.02] text-white hover:text-white transition-all duration-300 cursor-pointer"
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Test Candle Data
            </Button>

            <Button
              onClick={testTrades}
              disabled={loading}
              className="border-white/20 bg-white/5 hover:bg-gradient-to-r hover:from-violet-500/20 hover:to-cyan-500/20 hover:border-violet-500/40 hover:scale-[1.02] text-white hover:text-white transition-all duration-300 cursor-pointer"
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Test Trade Data
            </Button>

            <Button
              onClick={showSampleChart}
              className="border-white/20 bg-white/5 hover:bg-gradient-to-r hover:from-cyan-500/20 hover:to-violet-500/20 hover:border-cyan-500/40 hover:scale-[1.02] text-white hover:text-white transition-all duration-300 cursor-pointer"
            >
              {showChart ? "Hide" : "Show"} Sample Chart
            </Button>

            <Button
              onClick={regenerateTrades}
              disabled={loading}
              className="border-white/20 bg-white/5 hover:bg-gradient-to-r hover:from-rose-500/20 hover:to-orange-500/20 hover:border-rose-500/40 hover:scale-[1.02] text-white hover:text-white transition-all duration-300 cursor-pointer"
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Regenerate All Trades (30-240 min holds)
            </Button>
          </div>
        </div>
      </div>

      {/* Sample Chart */}
      {showChart && (
        <div className="relative rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-cyan-500/5 backdrop-blur-xl p-6">
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent rounded-2xl" />
          <div className="relative">
            <h3 className="text-lg font-semibold text-white mb-4">Sample Trade Chart</h3>
            <p className="text-sm text-white/60 mb-4">
              Example: Long ES from 5800 to 5825
            </p>
            <TradeChart
              symbol="ES"
              entryPrice={5800}
              exitPrice={5825}
              entryTime={new Date(new Date().setHours(10, 30, 0, 0))}
              exitTime={new Date(new Date().setHours(14, 30, 0, 0))}
              direction="long"
            />
          </div>
        </div>
      )}

      {/* Results Display */}
      {result && (
        <div className="relative rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 via-cyan-500/5 to-violet-500/5 backdrop-blur-xl p-6">
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent rounded-2xl" />
          <div className="relative">
            <h3 className="text-lg font-semibold text-white mb-4">Results</h3>

            {result.success ? (
              <div className="space-y-4">
                {result.candles && (
                  <div>
                    <p className="text-white/80 mb-2">
                      Generated <span className="text-emerald-400 font-bold">{result.count}</span> candles for{" "}
                      <span className="text-cyan-400 font-bold">{result.symbol}</span>
                    </p>
                    <div className="bg-black/30 rounded-lg p-4 overflow-auto max-h-96">
                      <pre className="text-xs text-white/60 font-mono">
                        {JSON.stringify(result.candles.slice(0, 5), null, 2)}
                      </pre>
                      <p className="text-white/40 text-xs mt-2">
                        (Showing first 5 of {result.candles.length} candles)
                      </p>
                    </div>
                  </div>
                )}

                {result.trades && (
                  <div>
                    <p className="text-white/80 mb-2">
                      Generated <span className="text-emerald-400 font-bold">{result.count}</span> trades
                    </p>
                    <p className="text-white/80 mb-2">
                      Total P&L: <span className={`font-bold ${result.totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        ${result.totalPnl}
                      </span>
                    </p>
                    <p className="text-white/80 mb-4">
                      Win Rate: <span className="text-cyan-400 font-bold">{result.winRate}%</span>
                    </p>
                    <div className="bg-black/30 rounded-lg p-4 overflow-auto max-h-96">
                      <pre className="text-xs text-white/60 font-mono">
                        {JSON.stringify(result.trades, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-4">
                <p className="text-rose-400">Error: {result.error}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="relative rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent rounded-2xl" />
        <div className="relative">
          <h3 className="text-lg font-semibold text-white mb-4">How to Use</h3>
          <ul className="space-y-2 text-white/80 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold">1.</span>
              <span>Click "Show Sample Chart" to see a live candlestick chart with realistic data</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold">2.</span>
              <span>Click "Test Candle Data" to see the raw API response for chart data</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold">3.</span>
              <span>Click "Test Trade Data" to see sample generated trades</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold">4.</span>
              <span>When viewing trades in your account, the charts will automatically use this realistic data</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
