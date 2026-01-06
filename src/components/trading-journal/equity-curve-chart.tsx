"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { motion } from "framer-motion";
import { format } from "date-fns";

interface EquityDataPoint {
  timestamp: string;
  balance: number;
  equity: number;
}

interface EquityCurveChartProps {
  data: EquityDataPoint[];
  initialBalance: number;
}

export function EquityCurveChart({ data, initialBalance }: EquityCurveChartProps) {
  // Calculate dynamic Y-axis domain based on data
  const balances = data.map(d => d.balance);
  const minBalance = Math.min(...balances);
  const maxBalance = Math.max(...balances);
  const range = maxBalance - minBalance;

  // Add 10% padding above and below for better visualization
  const padding = Math.max(range * 0.1, 100); // At least $100 padding
  const yMin = Math.floor((minBalance - padding) / 100) * 100; // Round down to nearest 100
  const yMax = Math.ceil((maxBalance + padding) / 100) * 100; // Round up to nearest 100

  // Calculate intelligent X-axis tick interval based on data length
  const dataLength = data.length;
  let tickInterval = 0; // 0 = auto

  if (dataLength > 60) {
    // More than 60 days: show every ~7 days
    tickInterval = Math.floor(dataLength / 8);
  } else if (dataLength > 30) {
    // 30-60 days: show every ~5 days
    tickInterval = Math.floor(dataLength / 6);
  } else if (dataLength > 14) {
    // 14-30 days: show every ~3 days
    tickInterval = Math.floor(dataLength / 5);
  } else if (dataLength > 7) {
    // 7-14 days: show every other day
    tickInterval = 1;
  }
  // else: 7 days or less, show all days (interval = 0)

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const pnl = data.balance - initialBalance;
      const isProfit = pnl >= 0;

      return (
        <div className="bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl p-4 shadow-2xl">
          <div className="text-xs text-white/60 mb-2">
            {format(new Date(data.timestamp), "MMM d, yyyy HH:mm")}
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-8">
              <span className="text-sm text-white/80">Balance</span>
              <span className="text-sm font-mono font-bold text-white">
                ${data.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center justify-between gap-8">
              <span className="text-sm text-white/80">P&L</span>
              <span className={`text-sm font-mono font-bold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isProfit ? '+' : ''}{pnl.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.4 }}
      className="relative"
    >
      {/* Chart container with gradient border */}
      <div className="relative rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-cyan-500/5 to-violet-500/10 backdrop-blur-xl overflow-hidden">
        {/* Layered gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent" />

        {/* Chart */}
        <div className="relative p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-white mb-1">Equity Curve</h3>
            <p className="text-sm text-white/60">Account balance over time</p>
          </div>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart
              data={data}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgb(16, 185, 129)" stopOpacity={0.4} />
                  <stop offset="50%" stopColor="rgb(6, 182, 212)" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="rgb(139, 92, 246)" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="rgb(16, 185, 129)" />
                  <stop offset="50%" stopColor="rgb(6, 182, 212)" />
                  <stop offset="100%" stopColor="rgb(139, 92, 246)" />
                </linearGradient>

                {/* Glow filter */}
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.03)"
                vertical={false}
              />

              <XAxis
                dataKey="timestamp"
                tickFormatter={(value) => format(new Date(value), "MMM d")}
                stroke="rgba(255,255,255,0.4)"
                style={{ fontSize: '11px', fontFamily: 'var(--font-geist-mono)', fill: 'rgba(255,255,255,0.6)' }}
                tickLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                height={50}
                tick={{ fill: 'rgba(255,255,255,0.6)' }}
                interval={tickInterval}
              />

              <YAxis
                domain={[yMin, yMax]}
                tickFormatter={(value) => `$${(value / 1000).toFixed(1)}k`}
                stroke="rgba(255,255,255,0.4)"
                style={{ fontSize: '11px', fontFamily: 'var(--font-geist-mono)', fill: 'rgba(255,255,255,0.6)' }}
                tickLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                width={70}
                tick={{ fill: 'rgba(255,255,255,0.6)' }}
              />

              <Tooltip content={<CustomTooltip />} />

              <ReferenceLine
                y={initialBalance}
                stroke="rgba(255,255,255,0.2)"
                strokeDasharray="5 5"
                label={{
                  value: "Initial",
                  position: "right",
                  fill: "rgba(255,255,255,0.4)",
                  fontSize: 11
                }}
              />

              <Area
                type="monotone"
                dataKey="balance"
                stroke="url(#lineGradient)"
                strokeWidth={3}
                fill="url(#equityGradient)"
                filter="url(#glow)"
                animationDuration={2000}
                animationEasing="ease-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
}
