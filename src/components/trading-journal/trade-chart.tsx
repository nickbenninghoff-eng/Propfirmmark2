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

// Extract base symbol from futures contract symbol (e.g., "ESH25" -> "ES", "NQH25" -> "NQ")
function extractBaseSymbol(symbol: string): string {
  // Common futures base symbols
  const futuresSymbols = ['ES', 'NQ', 'YM', 'CL', 'GC'];

  for (const baseSymbol of futuresSymbols) {
    if (symbol.startsWith(baseSymbol)) {
      return baseSymbol;
    }
  }

  // If no match, return first 2 characters as fallback
  return symbol.substring(0, 2).toUpperCase();
}

// Fetch realistic mock candlestick data from the API
async function fetchMockData(
  symbol: string,
  entryTime: Date,
  exitTime: Date
): Promise<any[]> {
  try {
    // Extract base symbol for mock data API
    const baseSymbol = extractBaseSymbol(symbol);

    // Fetch mock data for the trading day
    const response = await fetch(
      `/api/mock-data/candles?symbol=${baseSymbol}&interval=5&count=78`
    );

    if (!response.ok) {
      console.error("Failed to fetch mock data");
      return [];
    }

    const data = await response.json();
    return data.candles || [];
  } catch (error) {
    console.error("Error fetching mock data:", error);
    return [];
  }
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

    // Dynamically import lightweight-charts (v5 API)
    import('lightweight-charts').then(({ createChart, ColorType, CandlestickSeries, createSeriesMarkers }) => {
      if (!chartContainerRef.current) return;

      // Create chart using v5 API
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

      // Add candlestick series using v5 API
      candlestickSeries = chart.addSeries(CandlestickSeries, {
        upColor: "#10b981",
        downColor: "#ef4444",
        borderUpColor: "#10b981",
        borderDownColor: "#ef4444",
        wickUpColor: "#10b981",
        wickDownColor: "#ef4444",
      });

      // Fetch and set mock data
      fetchMockData(symbol, entryTime, exitTime).then((mockData) => {
        if (mockData.length > 0 && candlestickSeries) {
          candlestickSeries.setData(mockData);

          // Add markers after data is loaded (v5 API uses createSeriesMarkers)
          const markers = [
            {
              time: Math.floor(entryTime.getTime() / 1000) as number,
              position: (direction === "long" ? "belowBar" : "aboveBar") as "belowBar" | "aboveBar",
              color: "#10b981",
              shape: (direction === "long" ? "arrowUp" : "arrowDown") as "arrowUp" | "arrowDown",
              text: `Entry @ $${entryPrice.toFixed(2)}`,
            },
            {
              time: Math.floor(exitTime.getTime() / 1000) as number,
              position: (direction === "long" ? "aboveBar" : "belowBar") as "belowBar" | "aboveBar",
              color: "#ef4444",
              shape: (direction === "long" ? "arrowDown" : "arrowUp") as "arrowUp" | "arrowDown",
              text: `Exit @ $${exitPrice.toFixed(2)}`,
            },
          ];

          createSeriesMarkers(candlestickSeries, markers);

          // Fit content after data and markers are loaded
          if (chart) {
            chart.timeScale().fitContent();
          }
        }
      });

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
