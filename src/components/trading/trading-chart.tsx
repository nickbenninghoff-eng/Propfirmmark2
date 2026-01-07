"use client";

import { useEffect, useRef, useState } from "react";
import { createChart, ColorType, IChartApi, ISeriesApi } from "lightweight-charts";
import { useMarketPrice, usePositions, useOrders, useUpdateOrder, useCancelOrder, useClosePosition } from "@/hooks/use-trading-data";
import { toast } from "sonner";
import { X } from "lucide-react";

interface TradingChartProps {
  symbol: string;
  accountId: string;
}

export default function TradingChart({ symbol, accountId }: TradingChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [draggingOrder, setDraggingOrder] = useState<{orderId: string, priceType: 'limit' | 'stop'} | null>(null);
  const [dragY, setDragY] = useState<number | null>(null);
  const lastCandleRef = useRef<any>(null);
  const priceLinesRef = useRef<any[]>([]);
  const [priceCoordinates, setPriceCoordinates] = useState<Map<string, number>>(new Map());

  const { data: priceData } = useMarketPrice(symbol);
  const { data: positionsData } = usePositions(accountId);
  const { data: ordersData } = useOrders(accountId, "pending,submitted,working,partial");
  const updateOrderMutation = useUpdateOrder();
  const cancelOrderMutation = useCancelOrder();
  const closePositionMutation = useClosePosition();

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "rgba(255, 255, 255, 0.7)",
      },
      grid: {
        vertLines: { color: "rgba(255, 255, 255, 0.1)" },
        horzLines: { color: "rgba(255, 255, 255, 0.1)" },
      },
      width: chartContainerRef.current.clientWidth,
      height: 500,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        mode: 1,
      },
    });

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: "#10b981",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#10b981",
      wickDownColor: "#ef4444",
    });

    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, []);

  // Fetch and set candle data
  useEffect(() => {
    async function fetchCandles() {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/market-data/candles?symbol=${symbol}&interval=5&count=100`);
        const data = await res.json();

        if (data.success && candlestickSeriesRef.current) {
          candlestickSeriesRef.current.setData(data.candles);
          // Store reference to last candle
          if (data.candles.length > 0) {
            lastCandleRef.current = data.candles[data.candles.length - 1];
          }
          chartRef.current?.timeScale().fitContent();
        }
      } catch (error) {
        console.error("Error fetching candles:", error);
      } finally {
        setIsLoading(false);
      }
    }

    if (symbol) {
      fetchCandles();
    }
  }, [symbol]);

  // Update last candle with real-time price
  useEffect(() => {
    if (!candlestickSeriesRef.current || !priceData?.success || !lastCandleRef.current) {
      console.log('Candle update skipped:', {
        hasSeries: !!candlestickSeriesRef.current,
        priceSuccess: priceData?.success,
        hasLastCandle: !!lastCandleRef.current,
        price: priceData?.price
      });
      return;
    }

    const currentPrice = Number(priceData.price);
    const lastCandle = lastCandleRef.current;

    console.log('Updating candle with price:', currentPrice);

    // Update the last candle with current price
    const updatedCandle = {
      ...lastCandle,
      close: currentPrice,
      high: Math.max(lastCandle.high, currentPrice),
      low: Math.min(lastCandle.low, currentPrice),
    };

    // Update the candle
    candlestickSeriesRef.current.update(updatedCandle);
    lastCandleRef.current = updatedCandle;
  }, [priceData]);

  // Render price lines for positions and orders and calculate Y coordinates
  useEffect(() => {
    if (!chartRef.current || !candlestickSeriesRef.current || !chartContainerRef.current) return;

    // Remove all existing price lines
    priceLinesRef.current.forEach(line => {
      try {
        candlestickSeriesRef.current?.removePriceLine(line);
      } catch (e) {
        // Line might already be removed
      }
    });
    priceLinesRef.current = [];

    const currentPrice = priceData?.success ? Number(priceData.price) : null;
    const newCoordinates = new Map<string, number>();

    // Helper function to calculate Y coordinate from price
    const calculateYCoordinate = (price: number): number | null => {
      try {
        const timeScale = chartRef.current?.timeScale();
        const visibleRange = timeScale?.getVisibleLogicalRange();
        if (!visibleRange) return null;

        // Get price scale and calculate coordinate
        const priceScale = chartRef.current?.priceScale("right");
        if (!priceScale) return null;

        // Calculate using the container's bounding rect and price range
        const container = chartContainerRef.current;
        if (!container) return null;

        const rect = container.getBoundingClientRect();
        const chartHeight = rect.height;

        // Get visible price range from the series
        const seriesData = candlestickSeriesRef.current?.data();
        if (!seriesData) return null;

        // Find min/max prices in visible range
        let minPrice = Infinity;
        let maxPrice = -Infinity;

        (seriesData as any[]).forEach((candle: any) => {
          if (candle.low < minPrice) minPrice = candle.low;
          if (candle.high > maxPrice) maxPrice = candle.high;
        });

        if (minPrice === Infinity || maxPrice === -Infinity) return null;

        // Calculate Y coordinate based on price range
        const priceRange = maxPrice - minPrice;
        const priceRatio = (maxPrice - price) / priceRange;
        const yCoord = priceRatio * (chartHeight - 40) + 20; // Add margins

        return yCoord;
      } catch (e) {
        console.error('Error calculating Y coordinate:', e);
        return null;
      }
    };

    // Add price lines for open positions with real-time P&L
    if (positionsData?.success && currentPrice) {
      const positions = positionsData.positions || [];
      positions.forEach((position: any) => {
        if (position.symbol === symbol && candlestickSeriesRef.current) {
          const isLong = position.quantity > 0;
          const entryPrice = Number(position.avgEntryPrice);
          const quantity = Math.abs(position.quantity);

          // Calculate P&L based on contract type
          const tickValue = symbol.startsWith('ES') || symbol.startsWith('NQ') || symbol.startsWith('YM') ? 50 :
                           symbol.startsWith('CL') ? 1000 :
                           symbol.startsWith('GC') ? 100 : 50;

          const priceDiff = isLong ? (currentPrice - entryPrice) : (entryPrice - currentPrice);
          const unrealizedPnL = priceDiff * tickValue * quantity;
          const pnlSign = unrealizedPnL >= 0 ? "+" : "";

          const priceLine = candlestickSeriesRef.current.createPriceLine({
            price: entryPrice,
            color: isLong ? "#10b981" : "#ef4444",
            lineWidth: 2,
            lineStyle: 2, // Dashed
            axisLabelVisible: true,
            title: `${isLong ? "LONG" : "SHORT"} ${quantity} @ $${entryPrice.toFixed(2)} | P&L: ${pnlSign}$${unrealizedPnL.toFixed(2)}`,
          });
          priceLinesRef.current.push(priceLine);

          // Store Y coordinate
          const yCoord = calculateYCoordinate(entryPrice);
          if (yCoord !== null) {
            newCoordinates.set(`position-${position.id}`, yCoord);
          }
        }
      });
    }

    // Add price lines for working orders (draggable)
    if (ordersData?.success) {
      const orders = ordersData.orders || [];
      orders.forEach((order: any) => {
        if (order.symbol === symbol && candlestickSeriesRef.current) {
          // Show limit price line for limit and stop-limit orders
          if ((order.orderType === "limit" || order.orderType === "stop_limit") && order.limitPrice) {
            const limitPrice = Number(order.limitPrice);
            const priceLine = candlestickSeriesRef.current.createPriceLine({
              price: limitPrice,
              color: order.side === "buy" ? "#06b6d4" : "#8b5cf6",
              lineWidth: 2,
              lineStyle: 0, // Solid
              axisLabelVisible: true,
              title: `${order.orderType.toUpperCase()} ${order.side.toUpperCase()} ${order.quantity} @ ${limitPrice.toFixed(2)}`,
            });
            priceLinesRef.current.push(priceLine);

            // Store Y coordinate
            const yCoord = calculateYCoordinate(limitPrice);
            if (yCoord !== null) {
              newCoordinates.set(`order-${order.id}`, yCoord);
            }
          }

          // Show stop price line for stop orders
          if ((order.orderType === "stop" || order.orderType === "stop_limit" || order.orderType === "trailing_stop") && order.stopPrice) {
            const stopPrice = Number(order.stopPrice);
            const priceLine = candlestickSeriesRef.current.createPriceLine({
              price: stopPrice,
              color: "#f59e0b",
              lineWidth: 2,
              lineStyle: 1, // Dotted
              axisLabelVisible: true,
              title: `STOP @ ${stopPrice.toFixed(2)}`,
            });
            priceLinesRef.current.push(priceLine);

            // Store Y coordinate (use same key since we show one button per order)
            const yCoord = calculateYCoordinate(stopPrice);
            if (yCoord !== null) {
              newCoordinates.set(`order-${order.id}`, yCoord);
            }
          }
        }
      });
    }

    setPriceCoordinates(newCoordinates);
  }, [positionsData, ordersData, symbol]);

  // Handle global mouse events for dragging
  useEffect(() => {
    if (!draggingOrder || !chartRef.current || !chartContainerRef.current) return;

    const container = chartContainerRef.current;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const y = e.clientY - rect.top;

      // Update drag position
      setDragY(y);
      e.preventDefault();
    };

    const handleMouseUp = async (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const y = e.clientY - rect.top;

      // Calculate price from Y coordinate
      let newPrice: number | null = null;
      try {
        const seriesData = candlestickSeriesRef.current?.data();
        if (seriesData && seriesData.length > 0) {
          // Find min/max prices
          let minPrice = Infinity;
          let maxPrice = -Infinity;
          (seriesData as any[]).forEach((candle: any) => {
            if (candle.low < minPrice) minPrice = candle.low;
            if (candle.high > maxPrice) maxPrice = candle.high;
          });

          if (minPrice !== Infinity && maxPrice !== -Infinity) {
            const chartHeight = rect.height;
            const priceRange = maxPrice - minPrice;
            const priceRatio = (y - 20) / (chartHeight - 40);
            newPrice = maxPrice - (priceRatio * priceRange);
          }
        }
      } catch (error) {
        console.error('Error calculating price from coordinate:', error);
      }

      console.log(`Released order ${draggingOrder.orderId} at new price: $${newPrice?.toFixed(2)}`);

      if (newPrice) {
        try {
          // Update the order
          const updateData: any = {
            orderId: draggingOrder.orderId,
            accountId,
          };

          if (draggingOrder.priceType === 'limit') {
            updateData.limitPrice = newPrice;
          } else {
            updateData.stopPrice = newPrice;
          }

          console.log('Updating order with:', updateData);
          await updateOrderMutation.mutateAsync(updateData);
          toast.success(`Order ${draggingOrder.priceType} price updated to $${newPrice.toFixed(2)}`);
        } catch (error: any) {
          console.error('Order update error:', error);
          toast.error(error.message || "Failed to update order");
        }
      }

      setDraggingOrder(null);
      setDragY(null);

      // Re-enable chart interactions
      if (chartRef.current) {
        chartRef.current.applyOptions({
          handleScroll: true,
          handleScale: true,
        });
      }
    };

    // Use document-level listeners to capture mouse events globally
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);

      // Ensure chart interactions are re-enabled on cleanup
      if (chartRef.current) {
        chartRef.current.applyOptions({
          handleScroll: true,
          handleScale: true,
        });
      }
    };
  }, [draggingOrder, accountId, updateOrderMutation]);

  // Handle closing position
  const handleClosePosition = async (posSymbol: string) => {
    try {
      await closePositionMutation.mutateAsync({ accountId, symbol: posSymbol });
      toast.success(`Closed position for ${posSymbol}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to close position");
    }
  };

  // Handle canceling order
  const handleCancelOrder = async (orderId: string) => {
    try {
      await cancelOrderMutation.mutateAsync({ orderId, accountId });
      toast.success("Order cancelled");
    } catch (error: any) {
      toast.error(error.message || "Failed to cancel order");
    }
  };

  return (
    <div className="relative">
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="text-white/60">Loading chart...</div>
        </div>
      )}
      <div ref={chartContainerRef} className="rounded-lg" style={{ cursor: draggingOrder ? 'grabbing' : 'default' }} />

      {/* Close/Cancel buttons for positions - integrated into price axis */}
      {positionsData?.success && positionsData.positions.map((position: any) => {
        if (position.symbol !== symbol) return null;

        const yCoord = priceCoordinates.get(`position-${position.id}`);
        if (!yCoord) return null;

        const chartWidth = chartContainerRef.current?.getBoundingClientRect().width || 0;

        return (
          <button
            key={`position-close-${position.id}`}
            onClick={() => handleClosePosition(position.symbol)}
            className="absolute z-[100] flex h-5 w-5 items-center justify-center rounded border border-amber-500/80 bg-amber-500/30 text-amber-300 backdrop-blur-sm transition-all hover:scale-110 hover:bg-amber-500/50"
            style={{
              top: `${yCoord - 10}px`, // Adjust to center on line
              left: `${chartWidth - 70}px`,
            }}
            title="Close Position"
          >
            <X className="h-3 w-3" />
          </button>
        );
      })}

      {/* Drag handles for orders - integrated into price axis */}
      {ordersData?.success && ordersData.orders.map((order: any) => {
        if (order.symbol !== symbol) return null;

        const yCoord = priceCoordinates.get(`order-${order.id}`);
        if (!yCoord) return null;

        const limitPrice = order.limitPrice ? Number(order.limitPrice) : null;
        const stopPrice = order.stopPrice ? Number(order.stopPrice) : null;
        const priceType = limitPrice ? 'limit' : 'stop';

        const chartWidth = chartContainerRef.current?.getBoundingClientRect().width || 0;

        return (
          <>
            {/* Drag handle on left side of price info */}
            <div
              key={`order-drag-${order.id}`}
              className="absolute z-[100] flex h-5 w-8 cursor-grab items-center justify-center rounded border border-cyan-500/80 bg-cyan-500/30 text-cyan-300 backdrop-blur-sm transition-all hover:bg-cyan-500/50 active:cursor-grabbing"
              title="Drag to move order"
              style={{
                top: `${yCoord - 10}px`,
                left: `${chartWidth - 140}px`, // Left side of price axis
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const rect = chartContainerRef.current?.getBoundingClientRect();
                if (!rect) return;
                const y = e.clientY - rect.top;
                console.log(`Grabbed ${priceType} order ${order.id}`);
                setDraggingOrder({ orderId: order.id, priceType });
                setDragY(y);

                // Disable chart interactions
                if (chartRef.current) {
                  chartRef.current.applyOptions({
                    handleScroll: false,
                    handleScale: false,
                  });
                }
              }}
            >
              <span className="text-[10px] font-bold">:::</span>
            </div>

            {/* Cancel button on right side of price info */}
            <button
              key={`order-cancel-${order.id}`}
              onClick={() => handleCancelOrder(order.id)}
              className="absolute z-[100] flex h-5 w-5 items-center justify-center rounded border border-red-500/80 bg-red-500/30 text-red-300 backdrop-blur-sm transition-all hover:scale-110 hover:bg-red-500/50"
              title="Cancel Order"
              style={{
                top: `${yCoord - 10}px`,
                left: `${chartWidth - 75}px`, // Right side of price axis
              }}
            >
              <X className="h-3 w-3" />
            </button>
          </>
        );
      })}

      {/* Drag helper - visual line while dragging */}
      {draggingOrder && dragY !== null && (
        <div
          className="pointer-events-none absolute left-0 right-0 border-t-2 border-dashed border-cyan-400 z-50"
          style={{
            top: `${dragY}px`,
          }}
        />
      )}

      {/* Current Price Display */}
      {priceData?.success && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-white/50">Current Price</div>
          <div className="font-mono text-2xl font-bold text-cyan-400">
            ${Number(priceData.price).toFixed(2)}
          </div>
        </div>
      )}
    </div>
  );
}
