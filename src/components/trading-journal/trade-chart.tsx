"use client";

import { useEffect, useRef, useState } from "react";

interface TradeChartProps {
  symbol: string;
  entryPrice: number;
  exitPrice: number;
  entryTime: Date;
  exitTime: Date;
  direction: "long" | "short";
}

// Generate mock candlestick data for the trading day
function generateMockData(
  entryPrice: number,
  exitPrice: number,
  entryTime: Date,
  exitTime: Date,
  direction: "long" | "short"
) {
  const data = [];

  // Create timestamps from market open (9:30 AM) to close (4:00 PM)
  const marketOpen = new Date(entryTime);
  marketOpen.setHours(9, 30, 0, 0);

  const marketClose = new Date(entryTime);
  marketClose.setHours(16, 0, 0, 0);

  // Generate 5-minute bars
  const interval = 5 * 60 * 1000; // 5 minutes in ms
  let currentTime = marketOpen.getTime();

  // Calculate price range and volatility
  const priceRange = Math.abs(exitPrice - entryPrice);
  const volatility = priceRange * 0.3; // 30% of the move for realistic noise

  let currentPrice = entryPrice;
  const entryTimestamp = entryTime.getTime();
  const exitTimestamp = exitTime.getTime();

  while (currentTime <= marketClose.getTime()) {
    const timestamp = currentTime / 1000; // Convert to seconds for TradingView

    // Add realistic price movement
    const randomMove = (Math.random() - 0.5) * volatility * 0.1;

    // Trend towards exit price as we approach exit time
    let trendMove = 0;
    if (currentTime >= entryTimestamp && currentTime <= exitTimestamp) {
      const progress = (currentTime - entryTimestamp) / (exitTimestamp - entryTimestamp);
      const targetPrice = entryPrice + (exitPrice - entryPrice) * progress;
      trendMove = (targetPrice - currentPrice) * 0.3;
    }

    currentPrice += randomMove + trendMove;

    // Generate OHLC
    const open = currentPrice;
    const high = open + Math.abs(randomMove) * 1.5;
    const low = open - Math.abs(randomMove) * 1.5;
    const close = open + randomMove + trendMove;

    data.push({
      time: timestamp,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
    });

    currentPrice = close;
    currentTime += interval;
  }

  return data;
}

export function TradeChart({ symbol, entryPrice, exitPrice, entryTime, exitTime, direction }: TradeChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!chartContainerRef.current || !isClient) return;

    let chart: any;
    let candlestickSeries: any;

    // Dynamically import lightweight-charts
    import('lightweight-charts').then(({ createChart, ColorType }) => {
      if (!chartContainerRef.current) return;

      // Create chart using v4 API
      chart = createChart(chartContainerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: "#0a0a0a" },
          textColor: "#d1d5db",
        },
        grid: {
          vertLines: { color: "#1f2937" },
          horzLines: { color: "#1f2937" },
        },
        width: chartContainerRef.current.clientWidth,
        height: 500,
        timeScale: {
          timeVisible: true,
          secondsVisible: false,
          borderColor: "#374151",
        },
        rightPriceScale: {
          borderColor: "#374151",
        },
      });

      chartRef.current = chart;

      // Add candlestick series using v4 API
      candlestickSeries = chart.addCandlestickSeries({
        upColor: "#10b981",
        downColor: "#ef4444",
        borderUpColor: "#10b981",
        borderDownColor: "#ef4444",
        wickUpColor: "#10b981",
        wickDownColor: "#ef4444",
      });

      // Generate and set mock data
      const mockData = generateMockData(entryPrice, exitPrice, entryTime, exitTime, direction);
      candlestickSeries.setData(mockData);

      // Add markers directly to candlestick series (v4 API)
      const markers = [
        {
          time: Math.floor(entryTime.getTime() / 1000),
          position: direction === "long" ? "belowBar" : "aboveBar",
          color: "#10b981",
          shape: direction === "long" ? "arrowUp" : "arrowDown",
          text: `Entry @ $${entryPrice.toFixed(2)}`,
        },
        {
          time: Math.floor(exitTime.getTime() / 1000),
          position: direction === "long" ? "aboveBar" : "belowBar",
          color: "#ef4444",
          shape: direction === "long" ? "arrowDown" : "arrowUp",
          text: `Exit @ $${exitPrice.toFixed(2)}`,
        },
      ];

      candlestickSeries.setMarkers(markers);

      // Fit content
      chart.timeScale().fitContent();

      // Handle resize
      const handleResize = () => {
        if (chartContainerRef.current && chart) {
          chart.applyOptions({
            width: chartContainerRef.current.clientWidth,
          });
        }
      };

      window.addEventListener("resize", handleResize);

      // Cleanup function
      return () => {
        window.removeEventListener("resize", handleResize);
        if (chart) {
          chart.remove();
        }
      };
    });

    return () => {
      if (chart) {
        chart.remove();
      }
    };
  }, [symbol, entryPrice, exitPrice, entryTime, exitTime, direction, isClient]);

  return (
    <div className="w-full">
      <div ref={chartContainerRef} className="w-full rounded-lg overflow-hidden border border-white/10" />
    </div>
  );
}
