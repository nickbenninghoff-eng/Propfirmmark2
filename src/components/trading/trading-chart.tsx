"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createChart, ColorType, IChartApi, ISeriesApi } from "lightweight-charts";
import { useMarketPrice, usePositions, useOrders, useUpdateOrder, useCancelOrder, useClosePosition, useSubmitOrder } from "@/hooks/use-trading-data";
import { toast } from "sonner";
import { X, GripVertical } from "lucide-react";

interface TradingChartProps {
  symbol: string;
  accountId: string;
}

// Round price to tick size for the symbol
function roundToTick(price: number, symbol: string): number {
  // Get tick size based on symbol
  let tickSize = 0.25; // Default for ES, NQ
  if (symbol.startsWith('CL')) tickSize = 0.01;
  else if (symbol.startsWith('GC')) tickSize = 0.10;
  else if (symbol.startsWith('YM')) tickSize = 1;

  return Math.round(price / tickSize) * tickSize;
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
  // TP/SL props for positions
  showTPSL?: boolean;
  onTPDragStart?: (e: React.MouseEvent) => void;
  onSLDragStart?: (e: React.MouseEvent) => void;
}

function PriceLineLabel({
  yCoord,
  labelText,
  labelColor,
  onClose,
  onDragStart,
  isDraggable = false,
  closeTitle,
  showTPSL = false,
  onTPDragStart,
  onSLDragStart,
}: PriceLineLabelProps) {
  return (
    <div
      className="absolute z-[100] flex items-center gap-0.5 pointer-events-auto"
      style={{
        top: `${yCoord - 10}px`,
        right: '70px', // Position from right edge, before price axis
      }}
    >
      {/* TP/SL buttons - only for positions */}
      {showTPSL && (
        <>
          {/* Take Profit button */}
          <div
            className="flex h-5 w-7 cursor-grab items-center justify-center rounded-l border border-r-0 bg-black/60 backdrop-blur-sm transition-all hover:bg-emerald-500/30 active:cursor-grabbing"
            style={{ borderColor: '#10b981' }}
            title="Drag to set Take Profit"
            onMouseDown={onTPDragStart}
          >
            <span className="text-[9px] font-bold text-emerald-400">TP</span>
          </div>
          {/* Stop Loss button */}
          <div
            className="flex h-5 w-7 cursor-grab items-center justify-center border border-r-0 bg-black/60 backdrop-blur-sm transition-all hover:bg-red-500/30 active:cursor-grabbing"
            style={{ borderColor: '#ef4444' }}
            title="Drag to set Stop Loss"
            onMouseDown={onSLDragStart}
          >
            <span className="text-[9px] font-bold text-red-400">SL</span>
          </div>
        </>
      )}

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
        className={`flex h-5 items-center px-2 text-xs font-medium backdrop-blur-sm ${isDraggable || showTPSL ? '' : 'rounded-l'}`}
        style={{
          backgroundColor: 'rgba(0,0,0,0.7)',
          borderTop: `1px solid ${labelColor}`,
          borderBottom: `1px solid ${labelColor}`,
          borderLeft: (isDraggable || showTPSL) ? 'none' : `1px solid ${labelColor}`,
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
  const [draggingTPSL, setDraggingTPSL] = useState<{
    positionId: string;
    type: 'tp' | 'sl';
    entryPrice: number;
    quantity: number;
    isLong: boolean;
  } | null>(null);
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
  const submitOrderMutation = useSubmitOrder();

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

  // Update chart with real-time candle data from unified generator
  useEffect(() => {
    if (!candlestickSeriesRef.current || !priceData?.success) {
      return;
    }

    // Use the currentCandle from the unified generator
    // This ensures the chart shows exactly what the server knows
    const serverCandle = priceData.currentCandle;
    if (serverCandle) {
      const candle = {
        time: serverCandle.time,
        open: serverCandle.open,
        high: serverCandle.high,
        low: serverCandle.low,
        close: serverCandle.close,
      };

      candlestickSeriesRef.current.update(candle);
      lastCandleRef.current = candle;
    }
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
        // Match position symbol to chart symbol (both should be like "ESH25")
        if (position.symbol === symbol && candlestickSeriesRef.current) {
          const isLong = position.quantity > 0;
          const entryPrice = Number(position.avgEntryPrice);

          // Skip if entry price is invalid
          if (!entryPrice || isNaN(entryPrice) || entryPrice <= 0) {
            return;
          }

          try {
            const priceLine = candlestickSeriesRef.current.createPriceLine({
              price: entryPrice,
              color: isLong ? "#10b981" : "#ef4444",
              lineWidth: 2,
              lineStyle: 2, // Dashed
              axisLabelVisible: true,
              title: '', // No title - we render our own unified label
            });
            priceLinesRef.current.push(priceLine);
          } catch (e) {
            // Line creation failed - ignore
          }
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

  // Handle global mouse events for order dragging
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
        // Round to tick size
        const roundedPrice = roundToTick(newPrice, symbol);

        try {
          const updateData: any = {
            orderId: draggingOrder.orderId,
            accountId,
          };

          if (draggingOrder.priceType === 'limit') {
            updateData.limitPrice = roundedPrice;
          } else {
            updateData.stopPrice = roundedPrice;
          }

          await updateOrderMutation.mutateAsync(updateData);
          toast.success(`Order ${draggingOrder.priceType} price updated to $${roundedPrice.toFixed(2)}`);
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

  // Handle global mouse events for TP/SL dragging
  useEffect(() => {
    if (!draggingTPSL || !chartRef.current || !chartContainerRef.current) return;

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

      let targetPrice: number | null = null;
      try {
        if (candlestickSeriesRef.current) {
          targetPrice = candlestickSeriesRef.current.coordinateToPrice(y);
        }
      } catch (error) {
        console.error('Error calculating price from coordinate:', error);
      }

      if (targetPrice) {
        const { type, entryPrice, quantity, isLong } = draggingTPSL;

        // Round to tick size
        const roundedPrice = roundToTick(targetPrice, symbol);

        // Enforce directional rules
        // For LONG: TP must be above entry, SL must be below entry
        // For SHORT: TP must be below entry, SL must be above entry
        let isValidPrice = false;
        if (type === 'tp') {
          isValidPrice = isLong ? (roundedPrice > entryPrice) : (roundedPrice < entryPrice);
        } else {
          isValidPrice = isLong ? (roundedPrice < entryPrice) : (roundedPrice > entryPrice);
        }

        if (!isValidPrice) {
          const direction = isLong ? 'long' : 'short';
          const requirement = type === 'tp'
            ? (isLong ? 'above' : 'below')
            : (isLong ? 'below' : 'above');
          toast.error(`Take Profit must be ${type === 'tp' ? requirement : ''} and Stop Loss must be ${type === 'sl' ? requirement : ''} entry price for ${direction} positions`);
        } else {
          // Verify position still exists before creating order
          const positionStillExists = positionsData?.success &&
            positionsData.positions.some((p: any) =>
              p.symbol === symbol && p.quantity !== 0
            );

          if (!positionStillExists) {
            toast.error("Position was closed while dragging. Order not created.");
          } else {
            // Get current position to get the correct quantity (may have changed)
            const currentPosition = positionsData.positions.find((p: any) => p.symbol === symbol);
            const currentQuantity = currentPosition ? Math.abs(currentPosition.quantity) : quantity;
            const orderSide = isLong ? 'sell' : 'buy'; // Opposite of position to close it

            // Check if there's already an existing TP or SL order for this position
            // TP = limit order on opposite side, SL = stop order on opposite side
            const existingOrders = ordersData?.orders || [];
            const existingOrder = existingOrders.find((order: any) =>
              order.symbol === symbol &&
              order.side === orderSide &&
              ['pending', 'submitted', 'working', 'partial'].includes(order.status) &&
              (type === 'tp' ? order.orderType === 'limit' : order.orderType === 'stop')
            );

            try {
              if (existingOrder) {
                // Update the existing order with new price and quantity
                const updateData: any = {
                  orderId: existingOrder.id,
                  accountId,
                  quantity: currentQuantity, // Update to cover all contracts
                };

                if (type === 'tp') {
                  updateData.limitPrice = roundedPrice;
                } else {
                  updateData.stopPrice = roundedPrice;
                }

                await updateOrderMutation.mutateAsync(updateData);
                toast.success(`${type === 'tp' ? 'Take Profit' : 'Stop Loss'} updated to $${roundedPrice.toFixed(2)} for ${currentQuantity} contracts`);
              } else {
                // Create a new order
                // For TP: limit order to close the position (opposite side)
                // For SL: stop order to close the position (opposite side)
                const orderData = {
                  accountId,
                  symbol,
                  orderType: type === 'tp' ? 'limit' : 'stop',
                  side: orderSide,
                  quantity: currentQuantity,
                  ...(type === 'tp' ? { limitPrice: roundedPrice } : { stopPrice: roundedPrice }),
                  timeInForce: 'gtc', // Good till cancelled
                };

                await submitOrderMutation.mutateAsync(orderData);
                toast.success(`${type === 'tp' ? 'Take Profit' : 'Stop Loss'} set at $${roundedPrice.toFixed(2)}`);
              }
            } catch (error: any) {
              toast.error(error.message || `Failed to set ${type === 'tp' ? 'Take Profit' : 'Stop Loss'}`);
            }
          }
        }
      }

      setDraggingTPSL(null);
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
  }, [draggingTPSL, accountId, symbol, submitOrderMutation, positionsData]);

  // Handle closing position - also cancels any TP/SL orders
  const handleClosePosition = async (posSymbol: string) => {
    try {
      // First, find and cancel any TP/SL orders for this position
      // TP/SL orders are on the opposite side of the position
      if (ordersData?.success && positionsData?.success) {
        const position = positionsData.positions.find((p: any) => p.symbol === posSymbol);
        if (position) {
          const isLong = position.quantity > 0;
          const opposingSide = isLong ? 'sell' : 'buy';

          // Find orders that match: same symbol, opposite side (these are TP/SL orders)
          const tpslOrders = ordersData.orders.filter((order: any) =>
            order.symbol === posSymbol &&
            order.side === opposingSide &&
            ['pending', 'submitted', 'working', 'partial'].includes(order.status)
          );

          // Cancel each TP/SL order
          for (const order of tpslOrders) {
            try {
              await cancelOrderMutation.mutateAsync({ orderId: order.id, accountId });
            } catch (e) {
              console.error(`Failed to cancel order ${order.id}:`, e);
            }
          }

          if (tpslOrders.length > 0) {
            toast.success(`Cancelled ${tpslOrders.length} TP/SL order(s)`);
          }
        }
      }

      // Now close the position
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

  // Handle drag start for TP/SL
  const handleTPSLDragStart = (
    positionId: string,
    type: 'tp' | 'sl',
    entryPrice: number,
    quantity: number,
    isLong: boolean
  ) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = chartContainerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const y = e.clientY - rect.top;
    setDraggingTPSL({ positionId, type, entryPrice, quantity, isLong });
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

  // Determine drag line color based on what's being dragged
  const getDragLineColor = () => {
    if (draggingTPSL) {
      return draggingTPSL.type === 'tp' ? '#10b981' : '#ef4444';
    }
    return '#06b6d4'; // Default cyan for order dragging
  };

  return (
    <div className="relative">
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="text-white/60">Loading chart...</div>
        </div>
      )}
      <div ref={chartContainerRef} className="rounded-lg" style={{ cursor: (draggingOrder || draggingTPSL) ? 'grabbing' : 'default' }} />

      {/* Unified Position Labels */}
      {positionsData?.success && currentPrice && positionsData.positions.map((position: any) => {
        if (position.symbol !== symbol) return null;

        const entryPrice = Number(position.avgEntryPrice);

        // Skip if entry price is invalid
        if (!entryPrice || isNaN(entryPrice) || entryPrice <= 0) {
          return null;
        }

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
            showTPSL={true}
            onTPDragStart={handleTPSLDragStart(position.id, 'tp', entryPrice, quantity, isLong)}
            onSLDragStart={handleTPSLDragStart(position.id, 'sl', entryPrice, quantity, isLong)}
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
          : `STOP ${order.side.toUpperCase()} ${order.quantity} @ ${displayPrice.toFixed(2)}`;

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
      {(draggingOrder || draggingTPSL) && dragY !== null && (
        <div
          className="pointer-events-none absolute left-0 right-0 border-t-2 border-dashed z-50"
          style={{
            top: `${dragY}px`,
            borderColor: getDragLineColor(),
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
