"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createChart, ColorType, IChartApi, ISeriesApi } from "lightweight-charts";
import { useMarketPrice, usePositions, useOrders, useUpdateOrder, useCancelOrder, useClosePosition } from "@/hooks/use-trading-data";
import { toast } from "sonner";
import { X, GripVertical } from "lucide-react";

interface TradingChartProps {
  symbol: string;
  accountId: string;
}

// Unified label component that keeps all elements together
interface PriceLineLabelProps {
  yCoord: number;
  labelText: string;
  labelColor: string;
  onClose: () => void;
  onDragStart?: (e: React.MouseEvent) => void;
  isDraggable?: boolean;
  closeTitle: string;
}

function PriceLineLabel({
  yCoord,
  labelText,
  labelColor,
  onClose,
  onDragStart,
  isDraggable = false,
  closeTitle
}: PriceLineLabelProps) {
  return (
    <div
      className="absolute z-[100] flex items-center gap-0.5 pointer-events-auto"
      style={{
        top: `${yCoord - 10}px`,
        right: '70px', // Position from right edge, before price axis
      }}
    >
      {/* Drag handle - only for orders */}
      {isDraggable && onDragStart && (
        <div
          className="flex h-5 w-5 cursor-grab items-center justify-center rounded-l border border-r-0 bg-black/60 backdrop-blur-sm transition-all hover:bg-black/80 active:cursor-grabbing"
          style={{ borderColor: labelColor }}
          title="Drag to move order"
          onMouseDown={onDragStart}
        >
          <GripVertical className="h-3 w-3" style={{ color: labelColor }} />
        </div>
      )}

      {/* Label text */}
      <div
        className={`flex h-5 items-center px-2 text-xs font-medium backdrop-blur-sm ${isDraggable ? '' : 'rounded-l'}`}
        style={{
          backgroundColor: 'rgba(0,0,0,0.7)',
          borderTop: `1px solid ${labelColor}`,
          borderBottom: `1px solid ${labelColor}`,
          borderLeft: isDraggable ? 'none' : `1px solid ${labelColor}`,
          color: labelColor,
        }}
      >
        {labelText}
      </div>

      {/* Close/Cancel button */}
      <button
        onClick={onClose}
        className="flex h-5 w-5 items-center justify-center rounded-r border border-l-0 bg-black/60 backdrop-blur-sm transition-all hover:bg-red-500/30"
        style={{ borderColor: labelColor }}
        title={closeTitle}
      >
        <X className="h-3 w-3 text-red-400" />
      </button>
    </div>
  );
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
  const [, forceUpdate] = useState(0); // Force re-render for coordinate updates

  const { data: priceData } = useMarketPrice(symbol);
  const { data: positionsData } = usePositions(accountId);
  const { data: ordersData } = useOrders(accountId, "pending,submitted,working,partial");
  const updateOrderMutation = useUpdateOrder();
  const cancelOrderMutation = useCancelOrder();
  const closePositionMutation = useClosePosition();

  // Get Y coordinate for a price - called during render for real-time accuracy
  const getYCoordinate = useCallback((price: number): number | null => {
    if (!candlestickSeriesRef.current) return null;
    try {
      return candlestickSeriesRef.current.priceToCoordinate(price);
    } catch {
      return null;
    }
  }, []);

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
        forceUpdate(n => n + 1); // Update label positions
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
      return;
    }

    const currentPrice = Number(priceData.price);
    const lastCandle = lastCandleRef.current;

    const updatedCandle = {
      ...lastCandle,
      close: currentPrice,
      high: Math.max(lastCandle.high, currentPrice),
      low: Math.min(lastCandle.low, currentPrice),
    };

    candlestickSeriesRef.current.update(updatedCandle);
    lastCandleRef.current = updatedCandle;
  }, [priceData]);

  // Render price lines (without titles - we render our own labels)
  useEffect(() => {
    if (!chartRef.current || !candlestickSeriesRef.current) return;

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

    // Add price lines for open positions (no title - we render our own)
    if (positionsData?.success && currentPrice) {
      const positions = positionsData.positions || [];
      positions.forEach((position: any) => {
        if (position.symbol === symbol && candlestickSeriesRef.current) {
          const isLong = position.quantity > 0;
          const entryPrice = Number(position.avgEntryPrice);

          const priceLine = candlestickSeriesRef.current.createPriceLine({
            price: entryPrice,
            color: isLong ? "#10b981" : "#ef4444",
            lineWidth: 2,
            lineStyle: 2, // Dashed
            axisLabelVisible: true,
            title: '', // No title - we render our own unified label
          });
          priceLinesRef.current.push(priceLine);
        }
      });
    }

    // Add price lines for working orders (no title - we render our own)
    if (ordersData?.success) {
      const orders = ordersData.orders || [];
      orders.forEach((order: any) => {
        if (order.symbol === symbol && candlestickSeriesRef.current) {
          if ((order.orderType === "limit" || order.orderType === "stop_limit") && order.limitPrice) {
            const limitPrice = Number(order.limitPrice);
            const priceLine = candlestickSeriesRef.current.createPriceLine({
              price: limitPrice,
              color: order.side === "buy" ? "#06b6d4" : "#8b5cf6",
              lineWidth: 2,
              lineStyle: 0, // Solid
              axisLabelVisible: true,
              title: '', // No title - we render our own unified label
            });
            priceLinesRef.current.push(priceLine);
          }

          if ((order.orderType === "stop" || order.orderType === "stop_limit" || order.orderType === "trailing_stop") && order.stopPrice) {
            const stopPrice = Number(order.stopPrice);
            const priceLine = candlestickSeriesRef.current.createPriceLine({
              price: stopPrice,
              color: "#f59e0b",
              lineWidth: 2,
              lineStyle: 1, // Dotted
              axisLabelVisible: true,
              title: '', // No title - we render our own unified label
            });
            priceLinesRef.current.push(priceLine);
          }
        }
      });
    }
  }, [positionsData, ordersData, symbol, priceData]);

  // Subscribe to chart changes to update label positions
  useEffect(() => {
    if (!chartRef.current) return;

    const chart = chartRef.current;
    const handleUpdate = () => forceUpdate(n => n + 1);

    chart.timeScale().subscribeVisibleLogicalRangeChange(handleUpdate);
    chart.subscribeCrosshairMove(handleUpdate);

    return () => {
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(handleUpdate);
      chart.unsubscribeCrosshairMove(handleUpdate);
    };
  }, []);

  // Handle global mouse events for dragging
  useEffect(() => {
    if (!draggingOrder || !chartRef.current || !chartContainerRef.current) return;

    const container = chartContainerRef.current;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const y = e.clientY - rect.top;
      setDragY(y);
      e.preventDefault();
    };

    const handleMouseUp = async (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const y = e.clientY - rect.top;

      let newPrice: number | null = null;
      try {
        if (candlestickSeriesRef.current) {
          newPrice = candlestickSeriesRef.current.coordinateToPrice(y);
        }
      } catch (error) {
        console.error('Error calculating price from coordinate:', error);
      }

      if (newPrice) {
        try {
          const updateData: any = {
            orderId: draggingOrder.orderId,
            accountId,
          };

          if (draggingOrder.priceType === 'limit') {
            updateData.limitPrice = newPrice;
          } else {
            updateData.stopPrice = newPrice;
          }

          await updateOrderMutation.mutateAsync(updateData);
          toast.success(`Order ${draggingOrder.priceType} price updated to $${newPrice.toFixed(2)}`);
        } catch (error: any) {
          toast.error(error.message || "Failed to update order");
        }
      }

      setDraggingOrder(null);
      setDragY(null);

      if (chartRef.current) {
        chartRef.current.applyOptions({
          handleScroll: true,
          handleScale: true,
        });
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);

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

  // Handle drag start for orders
  const handleOrderDragStart = (orderId: string, priceType: 'limit' | 'stop') => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = chartContainerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const y = e.clientY - rect.top;
    setDraggingOrder({ orderId, priceType });
    setDragY(y);

    if (chartRef.current) {
      chartRef.current.applyOptions({
        handleScroll: false,
        handleScale: false,
      });
    }
  };

  // Calculate current price for P&L
  const currentPrice = priceData?.success ? Number(priceData.price) : null;

  return (
    <div className="relative">
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="text-white/60">Loading chart...</div>
        </div>
      )}
      <div ref={chartContainerRef} className="rounded-lg" style={{ cursor: draggingOrder ? 'grabbing' : 'default' }} />

      {/* Unified Position Labels */}
      {positionsData?.success && currentPrice && positionsData.positions.map((position: any) => {
        if (position.symbol !== symbol) return null;

        const entryPrice = Number(position.avgEntryPrice);
        const yCoord = getYCoordinate(entryPrice);
        if (yCoord === null) return null;

        const isLong = position.quantity > 0;
        const quantity = Math.abs(position.quantity);

        // Calculate P&L
        const tickValue = symbol.startsWith('ES') || symbol.startsWith('NQ') || symbol.startsWith('YM') ? 50 :
                         symbol.startsWith('CL') ? 1000 :
                         symbol.startsWith('GC') ? 100 : 50;
        const priceDiff = isLong ? (currentPrice - entryPrice) : (entryPrice - currentPrice);
        const unrealizedPnL = priceDiff * tickValue * quantity;
        const pnlSign = unrealizedPnL >= 0 ? "+" : "";
        const pnlColor = unrealizedPnL >= 0 ? "#10b981" : "#ef4444";

        const labelText = `${isLong ? "LONG" : "SHORT"} ${quantity} @ $${entryPrice.toFixed(2)} | P&L: ${pnlSign}$${unrealizedPnL.toFixed(2)}`;
        const labelColor = isLong ? "#10b981" : "#ef4444";

        return (
          <PriceLineLabel
            key={`position-label-${position.id}`}
            yCoord={yCoord}
            labelText={labelText}
            labelColor={labelColor}
            onClose={() => handleClosePosition(position.symbol)}
            closeTitle="Close Position"
          />
        );
      })}

      {/* Unified Order Labels */}
      {ordersData?.success && ordersData.orders.map((order: any) => {
        if (order.symbol !== symbol) return null;

        const limitPrice = order.limitPrice ? Number(order.limitPrice) : null;
        const stopPrice = order.stopPrice ? Number(order.stopPrice) : null;
        const displayPrice = limitPrice || stopPrice;
        if (!displayPrice) return null;

        const yCoord = getYCoordinate(displayPrice);
        if (yCoord === null) return null;

        const priceType = limitPrice ? 'limit' : 'stop';
        const labelText = limitPrice
          ? `${order.orderType.toUpperCase()} ${order.side.toUpperCase()} ${order.quantity} @ ${displayPrice.toFixed(2)}`
          : `STOP @ ${displayPrice.toFixed(2)}`;

        const labelColor = limitPrice
          ? (order.side === "buy" ? "#06b6d4" : "#8b5cf6")
          : "#f59e0b";

        return (
          <PriceLineLabel
            key={`order-label-${order.id}`}
            yCoord={yCoord}
            labelText={labelText}
            labelColor={labelColor}
            onClose={() => handleCancelOrder(order.id)}
            onDragStart={handleOrderDragStart(order.id, priceType)}
            isDraggable={true}
            closeTitle="Cancel Order"
          />
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
