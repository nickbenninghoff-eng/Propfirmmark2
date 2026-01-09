"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickSeries, createTextWatermark } from "lightweight-charts";
import { useMarketPrice, usePositions, useOrders, useUpdateOrder, useCancelOrder, useClosePosition, useSubmitOrder } from "@/hooks/use-trading-data";
import { toast } from "sonner";
import { X, GripVertical, TrendingUp, TrendingDown, Target, ShieldAlert, Trash2, Minus, MousePointer, Pencil, Square, Circle } from "lucide-react";

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
  const [tooltipData, setTooltipData] = useState<{
    x: number;
    y: number;
    open: number;
    high: number;
    low: number;
    close: number;
    time: string;
  } | null>(null);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    price: number;
  } | null>(null);

  // Drawing tools state
  type DrawingMode = 'none' | 'horizontal' | 'trendline' | 'rectangle' | 'circle';
  const [drawingMode, setDrawingMode] = useState<DrawingMode>('none');
  const [horizontalLines, setHorizontalLines] = useState<{ id: string; price: number; color: string }[]>([]);
  const [trendLines, setTrendLines] = useState<{
    id: string;
    start: { time: number; price: number };
    end: { time: number; price: number };
    color: string;
  }[]>([]);
  const [rectangles, setRectangles] = useState<{
    id: string;
    start: { time: number; price: number };
    end: { time: number; price: number };
    color: string;
  }[]>([]);
  const [circles, setCircles] = useState<{
    id: string;
    center: { time: number; price: number };
    radiusX: number;
    radiusY: number;
    color: string;
  }[]>([]);
  const [pendingTrendLine, setPendingTrendLine] = useState<{
    start: { time: number; price: number };
  } | null>(null);
  const [pendingRectangle, setPendingRectangle] = useState<{
    start: { time: number; price: number };
  } | null>(null);
  const [pendingCircle, setPendingCircle] = useState<{
    center: { time: number; price: number };
  } | null>(null);

  // Dragging state for drawings
  const [draggingHLine, setDraggingHLine] = useState<string | null>(null);
  const [draggingTrendLine, setDraggingTrendLine] = useState<{ id: string; point: 'start' | 'end' | 'whole' } | null>(null);
  const [draggingRectangle, setDraggingRectangle] = useState<{ id: string; corner: 'start' | 'end' | 'whole' } | null>(null);
  const [draggingCircle, setDraggingCircle] = useState<{ id: string; part: 'center' | 'radius' } | null>(null);

  // Active drawing state (for click-and-drag UX)
  const [activeDrawing, setActiveDrawing] = useState<{
    type: 'trendline' | 'rectangle' | 'circle';
    start: { time: number; price: number };
    startCoord: { x: number; y: number };
  } | null>(null);

  // Preview coordinates while drawing
  const [previewCoord, setPreviewCoord] = useState<{ x: number; y: number } | null>(null);

  // Selected drawing (for delete hotkey)
  const [selectedDrawing, setSelectedDrawing] = useState<{
    type: 'hline' | 'trendline' | 'rectangle' | 'circle';
    id: string;
  } | null>(null);

  // Crosshair info bar state
  const [crosshairInfo, setCrosshairInfo] = useState<{
    price: number;
    time: string;
  } | null>(null);

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
        textColor: "#67e8f9", // Neon cyan for axis text
      },
      grid: {
        vertLines: { color: "rgba(168, 85, 247, 0.08)" }, // Subtle purple tint
        horzLines: { color: "rgba(34, 211, 238, 0.08)" }, // Subtle cyan tint
      },
      width: chartContainerRef.current.clientWidth,
      height: 500,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: "rgba(168, 85, 247, 0.4)", // Purple border
      },
      rightPriceScale: {
        borderColor: "rgba(34, 211, 238, 0.4)", // Cyan border
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: "rgba(168, 85, 247, 0.5)", // Purple crosshair
          width: 1,
          style: 2, // Dashed
          labelBackgroundColor: "#a855f7",
        },
        horzLine: {
          color: "rgba(34, 211, 238, 0.5)", // Cyan crosshair
          width: 1,
          style: 2, // Dashed
          labelBackgroundColor: "#22d3ee",
        },
      },
    });

    // Neon candlestick colors
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#4ade80", // Bright neon green
      downColor: "#fb7185", // Bright neon rose
      borderVisible: false,
      wickUpColor: "#4ade80",
      wickDownColor: "#fb7185",
    });

    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;

    // Add watermark with neon gradient effect (using multiple lines for glow simulation)
    try {
      createTextWatermark(chart.panes()[0], {
        horzAlign: 'center',
        vertAlign: 'center',
        lines: [{
          text: symbol,
          color: 'rgba(168, 85, 247, 0.15)', // Purple tint watermark
          fontSize: 72,
          fontStyle: 'bold',
        }],
      });
      console.log('[TradingChart] Watermark created for', symbol);
    } catch (e) {
      console.error('[TradingChart] Failed to create watermark:', e);
    }

    // OHLC Tooltip and Crosshair Info Bar on crosshair move
    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.point) {
        setTooltipData(null);
        setCrosshairInfo(null);
        return;
      }

      // Get price at crosshair Y position
      const crosshairPrice = candlestickSeries.coordinateToPrice(param.point.y);
      const timeStr = typeof param.time === 'number'
        ? new Date(param.time * 1000).toLocaleString()
        : String(param.time);

      // Update crosshair info bar
      if (crosshairPrice !== null) {
        setCrosshairInfo({
          price: crosshairPrice,
          time: timeStr,
        });
      }

      const data = param.seriesData.get(candlestickSeries);
      if (data && 'open' in data) {
        const ohlcData = data as { open: number; high: number; low: number; close: number };

        setTooltipData({
          x: param.point.x,
          y: param.point.y,
          open: ohlcData.open,
          high: ohlcData.high,
          low: ohlcData.low,
          close: ohlcData.close,
          time: timeStr,
        });
      } else {
        setTooltipData(null);
      }
    });

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
  }, [symbol]);

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

  // Handle right-click context menu
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();

    if (!candlestickSeriesRef.current || !chartContainerRef.current) return;

    const rect = chartContainerRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;

    try {
      const price = candlestickSeriesRef.current.coordinateToPrice(y);
      if (price !== null) {
        const roundedPrice = roundToTick(price, symbol);
        setContextMenu({
          x: e.clientX - rect.left,
          y: y,
          price: roundedPrice,
        });
      }
    } catch (error) {
      console.error('Error getting price from coordinate:', error);
    }
  };

  // Close context menu
  const closeContextMenu = () => setContextMenu(null);

  // Context menu actions
  const handleBuyLimit = async () => {
    if (!contextMenu) return;
    try {
      await submitOrderMutation.mutateAsync({
        accountId,
        symbol,
        orderType: 'limit',
        side: 'buy',
        quantity: 1,
        limitPrice: contextMenu.price,
        timeInForce: 'gtc',
      });
      toast.success(`Buy limit order placed at $${contextMenu.price.toFixed(2)}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to place order');
    }
    closeContextMenu();
  };

  const handleSellLimit = async () => {
    if (!contextMenu) return;
    try {
      await submitOrderMutation.mutateAsync({
        accountId,
        symbol,
        orderType: 'limit',
        side: 'sell',
        quantity: 1,
        limitPrice: contextMenu.price,
        timeInForce: 'gtc',
      });
      toast.success(`Sell limit order placed at $${contextMenu.price.toFixed(2)}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to place order');
    }
    closeContextMenu();
  };

  const handleBuyStop = async () => {
    if (!contextMenu) return;
    try {
      await submitOrderMutation.mutateAsync({
        accountId,
        symbol,
        orderType: 'stop',
        side: 'buy',
        quantity: 1,
        stopPrice: contextMenu.price,
        timeInForce: 'gtc',
      });
      toast.success(`Buy stop order placed at $${contextMenu.price.toFixed(2)}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to place order');
    }
    closeContextMenu();
  };

  const handleSellStop = async () => {
    if (!contextMenu) return;
    try {
      await submitOrderMutation.mutateAsync({
        accountId,
        symbol,
        orderType: 'stop',
        side: 'sell',
        quantity: 1,
        stopPrice: contextMenu.price,
        timeInForce: 'gtc',
      });
      toast.success(`Sell stop order placed at $${contextMenu.price.toFixed(2)}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to place order');
    }
    closeContextMenu();
  };

  // Close context menu when clicking outside
  useEffect(() => {
    if (!contextMenu) return;

    const handleClickOutside = () => closeContextMenu();
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('contextmenu', handleClickOutside);

    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('contextmenu', handleClickOutside);
    };
  }, [contextMenu]);

  // Keyboard shortcuts for drawing tools
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDrawingMode('none');
        setPendingTrendLine(null);
        setPendingRectangle(null);
        setPendingCircle(null);
        setActiveDrawing(null);
        setPreviewCoord(null);
        setSelectedDrawing(null);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        // Delete currently selected or being-dragged drawing
        if (selectedDrawing) {
          if (selectedDrawing.type === 'hline') {
            deleteHorizontalLine(selectedDrawing.id);
          } else if (selectedDrawing.type === 'trendline') {
            deleteTrendLine(selectedDrawing.id);
          } else if (selectedDrawing.type === 'rectangle') {
            deleteRectangle(selectedDrawing.id);
          } else if (selectedDrawing.type === 'circle') {
            deleteCircle(selectedDrawing.id);
          }
          setSelectedDrawing(null);
          e.preventDefault();
        } else if (draggingHLine) {
          deleteHorizontalLine(draggingHLine);
          setDraggingHLine(null);
          e.preventDefault();
        } else if (draggingTrendLine) {
          deleteTrendLine(draggingTrendLine.id);
          setDraggingTrendLine(null);
          e.preventDefault();
        } else if (draggingRectangle) {
          deleteRectangle(draggingRectangle.id);
          setDraggingRectangle(null);
          e.preventDefault();
        } else if (draggingCircle) {
          deleteCircle(draggingCircle.id);
          setDraggingCircle(null);
          e.preventDefault();
        }
      } else if (e.key === 'h' || e.key === 'H') {
        if (drawingMode === 'none') {
          setDrawingMode('horizontal');
        }
      } else if (e.key === 't' || e.key === 'T') {
        if (drawingMode === 'none') {
          setDrawingMode('trendline');
        }
      } else if (e.key === 'r' || e.key === 'R') {
        if (drawingMode === 'none') {
          setDrawingMode('rectangle');
        }
      } else if (e.key === 'c' || e.key === 'C') {
        if (drawingMode === 'none') {
          setDrawingMode('circle');
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [drawingMode, selectedDrawing, draggingHLine, draggingTrendLine, draggingRectangle, draggingCircle]);

  // Handle chart mousedown for drawing tools (click-and-drag UX)
  const handleChartMouseDown = (e: React.MouseEvent) => {
    if (drawingMode === 'none' || !candlestickSeriesRef.current || !chartContainerRef.current || !chartRef.current) return;

    const rect = chartContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const price = candlestickSeriesRef.current.coordinateToPrice(y);
    const time = chartRef.current.timeScale().coordinateToTime(x);

    if (price === null) return;

    if (drawingMode === 'horizontal') {
      // Horizontal line is instant - single click
      const roundedPrice = roundToTick(price, symbol);
      const newLine = {
        id: `hline-${Date.now()}`,
        price: roundedPrice,
        color: '#facc15', // Neon yellow
      };
      setHorizontalLines(prev => [...prev, newLine]);
      toast.success(`Horizontal line at $${roundedPrice.toFixed(2)}`);
      setDrawingMode('none');
    } else if (drawingMode === 'trendline' && time !== null) {
      // Start drawing trend line
      setActiveDrawing({
        type: 'trendline',
        start: { time: time as number, price },
        startCoord: { x, y },
      });
      setPendingTrendLine({ start: { time: time as number, price } });
      // Disable chart scrolling while drawing
      chartRef.current.applyOptions({ handleScroll: false, handleScale: false });
    } else if (drawingMode === 'rectangle' && time !== null) {
      // Start drawing rectangle
      setActiveDrawing({
        type: 'rectangle',
        start: { time: time as number, price },
        startCoord: { x, y },
      });
      setPendingRectangle({ start: { time: time as number, price } });
      chartRef.current.applyOptions({ handleScroll: false, handleScale: false });
    } else if (drawingMode === 'circle' && time !== null) {
      // Start drawing circle
      setActiveDrawing({
        type: 'circle',
        start: { time: time as number, price },
        startCoord: { x, y },
      });
      setPendingCircle({ center: { time: time as number, price } });
      chartRef.current.applyOptions({ handleScroll: false, handleScale: false });
    }
  };

  // Handle active drawing (mouse move while drawing)
  useEffect(() => {
    if (!activeDrawing || !chartContainerRef.current) return;

    const container = chartContainerRef.current;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Update preview coordinates for live rendering
      setPreviewCoord({ x, y });
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!candlestickSeriesRef.current || !chartRef.current) {
        setActiveDrawing(null);
        return;
      }

      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const price = candlestickSeriesRef.current.coordinateToPrice(y);
      const time = chartRef.current.timeScale().coordinateToTime(x);

      if (price !== null && time !== null) {
        if (activeDrawing.type === 'trendline') {
          const newTrendLine = {
            id: `tline-${Date.now()}`,
            start: activeDrawing.start,
            end: { time: time as number, price },
            color: '#a855f7', // Neon purple
          };
          setTrendLines(prev => [...prev, newTrendLine]);
          toast.success('Trend line drawn');
        } else if (activeDrawing.type === 'rectangle') {
          const newRectangle = {
            id: `rect-${Date.now()}`,
            start: activeDrawing.start,
            end: { time: time as number, price },
            color: '#22d3ee', // Neon cyan
          };
          setRectangles(prev => [...prev, newRectangle]);
          toast.success('Rectangle drawn');
        } else if (activeDrawing.type === 'circle') {
          const centerX = chartRef.current.timeScale().timeToCoordinate(activeDrawing.start.time as any);
          const centerY = candlestickSeriesRef.current.priceToCoordinate(activeDrawing.start.price);

          if (centerX !== null && centerY !== null) {
            const radiusX = Math.abs(x - centerX);
            const radiusY = Math.abs(y - centerY);

            const newCircle = {
              id: `circle-${Date.now()}`,
              center: activeDrawing.start,
              radiusX: Math.max(radiusX, 10), // Minimum radius
              radiusY: Math.max(radiusY, 10),
              color: '#f472b6', // Neon pink
            };
            setCircles(prev => [...prev, newCircle]);
            toast.success('Circle/Ellipse drawn');
          }
        }
      }

      // Clean up
      setActiveDrawing(null);
      setPreviewCoord(null);
      setPendingTrendLine(null);
      setPendingRectangle(null);
      setPendingCircle(null);
      setDrawingMode('none');

      if (chartRef.current) {
        chartRef.current.applyOptions({ handleScroll: true, handleScale: true });
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      setPreviewCoord(null);
    };
  }, [activeDrawing, symbol]);

  // Delete a horizontal line
  const deleteHorizontalLine = (id: string) => {
    setHorizontalLines(prev => prev.filter(line => line.id !== id));
  };

  // Delete a trend line
  const deleteTrendLine = (id: string) => {
    setTrendLines(prev => prev.filter(line => line.id !== id));
  };

  // Delete a rectangle
  const deleteRectangle = (id: string) => {
    setRectangles(prev => prev.filter(rect => rect.id !== id));
  };

  // Delete a circle
  const deleteCircle = (id: string) => {
    setCircles(prev => prev.filter(circle => circle.id !== id));
  };

  // Handle global mouse events for horizontal line dragging
  useEffect(() => {
    if (!draggingHLine || !chartRef.current || !chartContainerRef.current) return;

    const container = chartContainerRef.current;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const y = e.clientY - rect.top;

      // Get the new price from the coordinate
      if (candlestickSeriesRef.current) {
        const newPrice = candlestickSeriesRef.current.coordinateToPrice(y);
        if (newPrice !== null) {
          const roundedPrice = roundToTick(newPrice, symbol);
          setHorizontalLines(prev => prev.map(line =>
            line.id === draggingHLine ? { ...line, price: roundedPrice } : line
          ));
        }
      }
      e.preventDefault();
    };

    const handleMouseUp = () => {
      setDraggingHLine(null);
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
    };
  }, [draggingHLine, symbol]);

  // Handle global mouse events for trend line dragging
  useEffect(() => {
    if (!draggingTrendLine || !chartRef.current || !chartContainerRef.current) return;

    const container = chartContainerRef.current;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (candlestickSeriesRef.current && chartRef.current) {
        const newPrice = candlestickSeriesRef.current.coordinateToPrice(y);
        const newTime = chartRef.current.timeScale().coordinateToTime(x);

        if (newPrice !== null && newTime !== null) {
          setTrendLines(prev => prev.map(line => {
            if (line.id !== draggingTrendLine.id) return line;

            if (draggingTrendLine.point === 'start') {
              return { ...line, start: { time: newTime as number, price: newPrice } };
            } else if (draggingTrendLine.point === 'end') {
              return { ...line, end: { time: newTime as number, price: newPrice } };
            } else {
              // Moving whole line - calculate offset and apply
              const timeScale = chartRef.current?.timeScale();
              const priceScale = candlestickSeriesRef.current;
              if (!timeScale || !priceScale) return line;

              // Get current coordinates of both points
              const startX = timeScale.timeToCoordinate(line.start.time as any);
              const startY = priceScale.priceToCoordinate(line.start.price);
              const endX = timeScale.timeToCoordinate(line.end.time as any);
              const endY = priceScale.priceToCoordinate(line.end.price);

              if (startX === null || startY === null || endX === null || endY === null) return line;

              // Calculate midpoint
              const midX = (startX + endX) / 2;
              const midY = (startY + endY) / 2;

              // Calculate offset from midpoint to current mouse position
              const offsetX = x - midX;
              const offsetY = y - midY;

              // Apply offset to both points
              const newStartTime = timeScale.coordinateToTime(startX + offsetX);
              const newStartPrice = priceScale.coordinateToPrice(startY + offsetY);
              const newEndTime = timeScale.coordinateToTime(endX + offsetX);
              const newEndPrice = priceScale.coordinateToPrice(endY + offsetY);

              if (newStartTime !== null && newStartPrice !== null && newEndTime !== null && newEndPrice !== null) {
                return {
                  ...line,
                  start: { time: newStartTime as number, price: newStartPrice },
                  end: { time: newEndTime as number, price: newEndPrice },
                };
              }
            }
            return line;
          }));
        }
      }
      e.preventDefault();
    };

    const handleMouseUp = () => {
      setDraggingTrendLine(null);
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
    };
  }, [draggingTrendLine]);

  // Handle global mouse events for rectangle dragging
  useEffect(() => {
    if (!draggingRectangle || !chartRef.current || !chartContainerRef.current) return;

    const container = chartContainerRef.current;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (candlestickSeriesRef.current && chartRef.current) {
        const newPrice = candlestickSeriesRef.current.coordinateToPrice(y);
        const newTime = chartRef.current.timeScale().coordinateToTime(x);

        if (newPrice !== null && newTime !== null) {
          setRectangles(prev => prev.map(r => {
            if (r.id !== draggingRectangle.id) return r;

            if (draggingRectangle.corner === 'start') {
              return { ...r, start: { time: newTime as number, price: newPrice } };
            } else if (draggingRectangle.corner === 'end') {
              return { ...r, end: { time: newTime as number, price: newPrice } };
            } else {
              // Moving whole rectangle
              const timeScale = chartRef.current?.timeScale();
              const priceScale = candlestickSeriesRef.current;
              if (!timeScale || !priceScale) return r;

              const startX = timeScale.timeToCoordinate(r.start.time as any);
              const startY = priceScale.priceToCoordinate(r.start.price);
              const endX = timeScale.timeToCoordinate(r.end.time as any);
              const endY = priceScale.priceToCoordinate(r.end.price);

              if (startX === null || startY === null || endX === null || endY === null) return r;

              const midX = (startX + endX) / 2;
              const midY = (startY + endY) / 2;
              const offsetX = x - midX;
              const offsetY = y - midY;

              const newStartTime = timeScale.coordinateToTime(startX + offsetX);
              const newStartPrice = priceScale.coordinateToPrice(startY + offsetY);
              const newEndTime = timeScale.coordinateToTime(endX + offsetX);
              const newEndPrice = priceScale.coordinateToPrice(endY + offsetY);

              if (newStartTime !== null && newStartPrice !== null && newEndTime !== null && newEndPrice !== null) {
                return {
                  ...r,
                  start: { time: newStartTime as number, price: newStartPrice },
                  end: { time: newEndTime as number, price: newEndPrice },
                };
              }
            }
            return r;
          }));
        }
      }
      e.preventDefault();
    };

    const handleMouseUp = () => {
      setDraggingRectangle(null);
      if (chartRef.current) {
        chartRef.current.applyOptions({ handleScroll: true, handleScale: true });
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [draggingRectangle]);

  // Handle global mouse events for circle dragging
  useEffect(() => {
    if (!draggingCircle || !chartRef.current || !chartContainerRef.current) return;

    const container = chartContainerRef.current;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (candlestickSeriesRef.current && chartRef.current) {
        const newPrice = candlestickSeriesRef.current.coordinateToPrice(y);
        const newTime = chartRef.current.timeScale().coordinateToTime(x);

        if (newPrice !== null && newTime !== null) {
          setCircles(prev => prev.map(c => {
            if (c.id !== draggingCircle.id) return c;

            if (draggingCircle.part === 'center') {
              return { ...c, center: { time: newTime as number, price: newPrice } };
            } else {
              // Adjusting radius
              const centerX = chartRef.current!.timeScale().timeToCoordinate(c.center.time as any);
              const centerY = candlestickSeriesRef.current!.priceToCoordinate(c.center.price);

              if (centerX !== null && centerY !== null) {
                return {
                  ...c,
                  radiusX: Math.max(Math.abs(x - centerX), 10),
                  radiusY: Math.max(Math.abs(y - centerY), 10),
                };
              }
            }
            return c;
          }));
        }
      }
      e.preventDefault();
    };

    const handleMouseUp = () => {
      setDraggingCircle(null);
      if (chartRef.current) {
        chartRef.current.applyOptions({ handleScroll: true, handleScale: true });
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [draggingCircle]);

  // Clear all drawings
  const clearAllDrawings = () => {
    setHorizontalLines([]);
    setTrendLines([]);
    setRectangles([]);
    setCircles([]);
    setPendingTrendLine(null);
    setPendingRectangle(null);
    setPendingCircle(null);
    setActiveDrawing(null);
    toast.success('All drawings cleared');
  };

  // Count total drawings
  const totalDrawings = horizontalLines.length + trendLines.length + rectangles.length + circles.length;

  // Get cursor style based on drawing mode
  const getChartCursor = () => {
    if (draggingOrder || draggingTPSL || draggingHLine || draggingTrendLine || draggingRectangle || draggingCircle || activeDrawing) return 'grabbing';
    if (drawingMode !== 'none') return 'crosshair';
    return 'default';
  };

  return (
    <div
      className="relative overflow-hidden rounded-xl"
      style={{
        background: 'linear-gradient(135deg, rgba(15, 5, 25, 0.95) 0%, rgba(10, 10, 20, 0.98) 50%, rgba(5, 15, 25, 0.95) 100%)',
        boxShadow: 'inset 0 0 100px rgba(168, 85, 247, 0.05), inset 0 0 60px rgba(34, 211, 238, 0.03), 0 0 40px rgba(168, 85, 247, 0.1)',
        border: '1px solid rgba(168, 85, 247, 0.2)',
      }}
    >
      {/* Neon glow overlay effects */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background: 'radial-gradient(ellipse at top left, rgba(168, 85, 247, 0.08) 0%, transparent 50%), radial-gradient(ellipse at bottom right, rgba(34, 211, 238, 0.08) 0%, transparent 50%)',
        }}
      />
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="text-purple-300" style={{ textShadow: '0 0 10px rgba(168, 85, 247, 0.5)' }}>Loading chart...</div>
        </div>
      )}
      {/* Drawing Toolbar */}
      <div className="absolute top-2 left-2 z-50 flex items-center gap-1 rounded-lg border border-white/20 bg-black/90 p-1.5 backdrop-blur-md shadow-lg shadow-black/50">
        <button
          onClick={() => setDrawingMode(drawingMode === 'none' ? 'none' : 'none')}
          className={`rounded p-2 transition-all duration-200 ${drawingMode === 'none' ? 'bg-white/20 text-white shadow-md shadow-white/20' : 'text-white/50 hover:bg-white/10 hover:text-white'}`}
          title="Select (ESC)"
        >
          <MousePointer className="h-4 w-4" />
        </button>
        <button
          onClick={() => setDrawingMode(drawingMode === 'horizontal' ? 'none' : 'horizontal')}
          className={`rounded p-2 transition-all duration-200 ${drawingMode === 'horizontal' ? 'bg-yellow-400/30 text-yellow-300 shadow-md shadow-yellow-400/50 ring-1 ring-yellow-400/50' : 'text-white/50 hover:bg-yellow-400/10 hover:text-yellow-300'}`}
          title="Horizontal Line (H)"
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          onClick={() => setDrawingMode(drawingMode === 'trendline' ? 'none' : 'trendline')}
          className={`rounded p-2 transition-all duration-200 ${drawingMode === 'trendline' ? 'bg-purple-500/30 text-purple-300 shadow-md shadow-purple-500/50 ring-1 ring-purple-500/50' : 'text-white/50 hover:bg-purple-500/10 hover:text-purple-300'}`}
          title="Trend Line (T)"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          onClick={() => setDrawingMode(drawingMode === 'rectangle' ? 'none' : 'rectangle')}
          className={`rounded p-2 transition-all duration-200 ${drawingMode === 'rectangle' ? 'bg-cyan-400/30 text-cyan-300 shadow-md shadow-cyan-400/50 ring-1 ring-cyan-400/50' : 'text-white/50 hover:bg-cyan-400/10 hover:text-cyan-300'}`}
          title="Rectangle (R)"
        >
          <Square className="h-4 w-4" />
        </button>
        <button
          onClick={() => setDrawingMode(drawingMode === 'circle' ? 'none' : 'circle')}
          className={`rounded p-2 transition-all duration-200 ${drawingMode === 'circle' ? 'bg-pink-400/30 text-pink-300 shadow-md shadow-pink-400/50 ring-1 ring-pink-400/50' : 'text-white/50 hover:bg-pink-400/10 hover:text-pink-300'}`}
          title="Circle (C)"
        >
          <Circle className="h-4 w-4" />
        </button>
        <div className="mx-1 h-4 w-px bg-white/20" />
        <button
          onClick={clearAllDrawings}
          disabled={totalDrawings === 0}
          className="rounded p-2 text-white/50 transition-all duration-200 hover:bg-red-500/30 hover:text-red-400 hover:shadow-md hover:shadow-red-500/30 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Clear All Drawings"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Crosshair Info Bar - Neon Cyberpunk Style */}
      {crosshairInfo && (
        <div className="absolute top-2 right-2 z-50 flex items-center gap-4 rounded-lg border border-cyan-500/30 bg-black/90 px-3 py-1.5 backdrop-blur-md shadow-lg shadow-cyan-500/10">
          <div className="flex items-center gap-2">
            <span className="text-xs text-cyan-400/70">Price:</span>
            <span className="font-mono text-sm font-medium text-cyan-300" style={{ textShadow: '0 0 10px rgba(34, 211, 238, 0.5)' }}>${crosshairInfo.price.toFixed(2)}</span>
          </div>
          <div className="h-3 w-px bg-purple-500/30" />
          <div className="flex items-center gap-2">
            <span className="text-xs text-purple-400/70">Time:</span>
            <span className="font-mono text-xs text-purple-300" style={{ textShadow: '0 0 8px rgba(168, 85, 247, 0.4)' }}>{crosshairInfo.time}</span>
          </div>
        </div>
      )}

      {/* Drawing Mode Indicator */}
      {drawingMode !== 'none' && (
        <div className="absolute top-14 left-2 z-50 rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs text-amber-400">
          {drawingMode === 'horizontal' ? 'Click to place horizontal line' :
           drawingMode === 'trendline' ? (activeDrawing ? 'Release to complete' : 'Click and drag to draw') :
           drawingMode === 'rectangle' ? (activeDrawing ? 'Release to complete' : 'Click and drag to draw') :
           drawingMode === 'circle' ? (activeDrawing ? 'Release to complete' : 'Click and drag to draw') : ''}
          <span className="ml-2 text-white/50">(ESC to cancel)</span>
        </div>
      )}

      <div
        ref={chartContainerRef}
        className="rounded-lg"
        style={{ cursor: getChartCursor() }}
        onContextMenu={handleContextMenu}
        onMouseDown={handleChartMouseDown}
      />

      {/* Live Preview while drawing */}
      {activeDrawing && previewCoord && chartContainerRef.current && (
        <svg
          className="absolute inset-0 z-[55] pointer-events-none"
          style={{
            width: chartContainerRef.current.clientWidth,
            height: 500,
          }}
        >
          <style>
            {`
              @keyframes marchingAnts {
                to { stroke-dashoffset: -16; }
              }
              .marching-ants {
                animation: marchingAnts 0.5s linear infinite;
              }
            `}
          </style>
          <defs>
            <filter id="neonGlowPurple" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="neonGlowCyan" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="neonGlowPink" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {activeDrawing.type === 'trendline' && (
            <>
              <line
                x1={activeDrawing.startCoord.x}
                y1={activeDrawing.startCoord.y}
                x2={previewCoord.x}
                y2={previewCoord.y}
                stroke="#a855f7"
                strokeWidth={3}
                strokeDasharray="8,4"
                strokeLinecap="round"
                filter="url(#neonGlowPurple)"
                className="marching-ants"
              />
              <circle cx={activeDrawing.startCoord.x} cy={activeDrawing.startCoord.y} r={8} fill="#a855f7" filter="url(#neonGlowPurple)" />
              <circle cx={activeDrawing.startCoord.x} cy={activeDrawing.startCoord.y} r={3} fill="#fff" />
              <circle cx={previewCoord.x} cy={previewCoord.y} r={8} fill="#a855f7" filter="url(#neonGlowPurple)" />
              <circle cx={previewCoord.x} cy={previewCoord.y} r={3} fill="#fff" />
            </>
          )}
          {activeDrawing.type === 'rectangle' && (() => {
            const left = Math.min(activeDrawing.startCoord.x, previewCoord.x);
            const top = Math.min(activeDrawing.startCoord.y, previewCoord.y);
            const width = Math.abs(previewCoord.x - activeDrawing.startCoord.x);
            const height = Math.abs(previewCoord.y - activeDrawing.startCoord.y);
            return (
              <>
                <rect
                  x={left}
                  y={top}
                  width={width}
                  height={height}
                  fill="rgba(34, 211, 238, 0.1)"
                  stroke="#22d3ee"
                  strokeWidth={3}
                  strokeDasharray="8,4"
                  strokeLinecap="round"
                  filter="url(#neonGlowCyan)"
                  className="marching-ants"
                />
                <circle cx={activeDrawing.startCoord.x} cy={activeDrawing.startCoord.y} r={8} fill="#22d3ee" filter="url(#neonGlowCyan)" />
                <circle cx={activeDrawing.startCoord.x} cy={activeDrawing.startCoord.y} r={3} fill="#fff" />
                <circle cx={previewCoord.x} cy={previewCoord.y} r={8} fill="#22d3ee" filter="url(#neonGlowCyan)" />
                <circle cx={previewCoord.x} cy={previewCoord.y} r={3} fill="#fff" />
              </>
            );
          })()}
          {activeDrawing.type === 'circle' && (() => {
            const radiusX = Math.abs(previewCoord.x - activeDrawing.startCoord.x);
            const radiusY = Math.abs(previewCoord.y - activeDrawing.startCoord.y);
            return (
              <>
                <ellipse
                  cx={activeDrawing.startCoord.x}
                  cy={activeDrawing.startCoord.y}
                  rx={Math.max(radiusX, 5)}
                  ry={Math.max(radiusY, 5)}
                  fill="rgba(244, 114, 182, 0.1)"
                  stroke="#f472b6"
                  strokeWidth={3}
                  strokeDasharray="8,4"
                  strokeLinecap="round"
                  filter="url(#neonGlowPink)"
                  className="marching-ants"
                />
                <circle cx={activeDrawing.startCoord.x} cy={activeDrawing.startCoord.y} r={8} fill="#f472b6" filter="url(#neonGlowPink)" />
                <circle cx={activeDrawing.startCoord.x} cy={activeDrawing.startCoord.y} r={3} fill="#fff" />
                <circle cx={activeDrawing.startCoord.x + radiusX} cy={activeDrawing.startCoord.y} r={8} fill="#f472b6" filter="url(#neonGlowPink)" />
                <circle cx={activeDrawing.startCoord.x + radiusX} cy={activeDrawing.startCoord.y} r={3} fill="#fff" />
              </>
            );
          })()}
        </svg>
      )}

      {/* OHLC Tooltip - Neon Cyberpunk Style */}
      {tooltipData && (
        <div
          className="pointer-events-none absolute z-50 rounded-lg border border-purple-500/30 bg-black/90 px-3 py-2 text-xs backdrop-blur-md shadow-lg shadow-purple-500/10"
          style={{
            left: tooltipData.x + 15,
            top: tooltipData.y - 80,
          }}
        >
          <div className="mb-1.5 text-purple-300/80" style={{ textShadow: '0 0 6px rgba(168, 85, 247, 0.3)' }}>{tooltipData.time}</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <span className="text-cyan-400/60">O:</span>
            <span className="font-mono text-white/90">{tooltipData.open.toFixed(2)}</span>
            <span className="text-cyan-400/60">H:</span>
            <span className="font-mono text-green-400" style={{ textShadow: '0 0 8px rgba(74, 222, 128, 0.4)' }}>{tooltipData.high.toFixed(2)}</span>
            <span className="text-cyan-400/60">L:</span>
            <span className="font-mono text-rose-400" style={{ textShadow: '0 0 8px rgba(251, 113, 133, 0.4)' }}>{tooltipData.low.toFixed(2)}</span>
            <span className="text-cyan-400/60">C:</span>
            <span className={`font-mono ${tooltipData.close >= tooltipData.open ? 'text-green-400' : 'text-rose-400'}`} style={{ textShadow: tooltipData.close >= tooltipData.open ? '0 0 8px rgba(74, 222, 128, 0.4)' : '0 0 8px rgba(251, 113, 133, 0.4)' }}>
              {tooltipData.close.toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* Right-Click Context Menu - Neon Cyberpunk Style */}
      {contextMenu && (
        <div
          className="absolute z-[200] min-w-[220px] rounded-lg border border-purple-500/30 bg-black/95 py-2 shadow-xl shadow-purple-500/10 backdrop-blur-md"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Price Header */}
          <div className="border-b border-purple-500/20 px-3 pb-2 mb-2">
            <div className="text-xs text-purple-400/70">Price</div>
            <div className="font-mono text-lg font-bold text-cyan-300" style={{ textShadow: '0 0 12px rgba(34, 211, 238, 0.5)' }}>${contextMenu.price.toFixed(2)}</div>
          </div>

          {/* Order Actions */}
          <div className="px-1">
            <button
              onClick={handleBuyLimit}
              className="flex w-full items-center gap-3 rounded px-3 py-2 text-left text-sm text-white/90 hover:bg-green-500/20 hover:shadow-sm hover:shadow-green-500/20 transition-all"
            >
              <TrendingUp className="h-4 w-4 text-green-400" />
              <span>Buy Limit</span>
              <span className="ml-auto text-xs text-green-400/70">@ ${contextMenu.price.toFixed(2)}</span>
            </button>
            <button
              onClick={handleSellLimit}
              className="flex w-full items-center gap-3 rounded px-3 py-2 text-left text-sm text-white/90 hover:bg-rose-500/20 hover:shadow-sm hover:shadow-rose-500/20 transition-all"
            >
              <TrendingDown className="h-4 w-4 text-rose-400" />
              <span>Sell Limit</span>
              <span className="ml-auto text-xs text-rose-400/70">@ ${contextMenu.price.toFixed(2)}</span>
            </button>

            <div className="my-1 border-t border-purple-500/20" />

            <button
              onClick={handleBuyStop}
              className="flex w-full items-center gap-3 rounded px-3 py-2 text-left text-sm text-white/90 hover:bg-green-500/20 hover:shadow-sm hover:shadow-green-500/20 transition-all"
            >
              <Target className="h-4 w-4 text-green-400" />
              <span>Buy Stop</span>
              <span className="ml-auto text-xs text-green-400/70">@ ${contextMenu.price.toFixed(2)}</span>
            </button>
            <button
              onClick={handleSellStop}
              className="flex w-full items-center gap-3 rounded px-3 py-2 text-left text-sm text-white/90 hover:bg-rose-500/20 hover:shadow-sm hover:shadow-rose-500/20 transition-all"
            >
              <ShieldAlert className="h-4 w-4 text-rose-400" />
              <span>Sell Stop</span>
              <span className="ml-auto text-xs text-rose-400/70">@ ${contextMenu.price.toFixed(2)}</span>
            </button>

            <div className="my-1 border-t border-purple-500/20" />

            {/* Drawing tools */}
            <button
              onClick={() => { setDrawingMode('horizontal'); closeContextMenu(); }}
              className="flex w-full items-center gap-3 rounded px-3 py-2 text-left text-sm text-white/90 hover:bg-yellow-400/20 hover:shadow-sm hover:shadow-yellow-400/20 transition-all"
            >
              <Minus className="h-4 w-4 text-yellow-400" />
              <span>Draw Horizontal Line</span>
            </button>
            <button
              onClick={() => { setDrawingMode('trendline'); closeContextMenu(); }}
              className="flex w-full items-center gap-3 rounded px-3 py-2 text-left text-sm text-white/90 hover:bg-purple-500/20 hover:shadow-sm hover:shadow-purple-500/20 transition-all"
            >
              <Pencil className="h-4 w-4 text-purple-400" />
              <span>Draw Trend Line</span>
            </button>
            <button
              onClick={() => { setDrawingMode('rectangle'); closeContextMenu(); }}
              className="flex w-full items-center gap-3 rounded px-3 py-2 text-left text-sm text-white/90 hover:bg-cyan-400/20 hover:shadow-sm hover:shadow-cyan-400/20 transition-all"
            >
              <Square className="h-4 w-4 text-cyan-400" />
              <span>Draw Rectangle</span>
            </button>
            <button
              onClick={() => { setDrawingMode('circle'); closeContextMenu(); }}
              className="flex w-full items-center gap-3 rounded px-3 py-2 text-left text-sm text-white/90 hover:bg-pink-400/20 hover:shadow-sm hover:shadow-pink-400/20 transition-all"
            >
              <Circle className="h-4 w-4 text-pink-400" />
              <span>Draw Circle/Ellipse</span>
            </button>
            <button
              onClick={() => { clearAllDrawings(); closeContextMenu(); }}
              disabled={totalDrawings === 0}
              className="flex w-full items-center gap-3 rounded px-3 py-2 text-left text-sm text-white/90 hover:bg-red-500/20 hover:shadow-sm hover:shadow-red-500/20 transition-all disabled:text-white/30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:shadow-none"
            >
              <Trash2 className="h-4 w-4 text-red-400" />
              <span>Clear All Drawings</span>
              {totalDrawings > 0 && (
                <span className="ml-auto text-xs text-red-400/70">({totalDrawings})</span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Horizontal Lines */}
      {horizontalLines.map(line => {
        const yCoord = getYCoordinate(line.price);
        if (yCoord === null) return null;

        const isDragging = draggingHLine === line.id;

        return (
          <div key={line.id}>
            {/* Line with neon glow */}
            <div
              className={`absolute left-0 right-[70px] z-[60] border-t-[3px] border-dashed transition-all ${isDragging ? 'opacity-70' : ''}`}
              style={{
                top: `${yCoord}px`,
                borderColor: line.color,
                boxShadow: `0 0 8px ${line.color}, 0 0 16px ${line.color}60`,
              }}
            />
            {/* Label with glow */}
            <div
              className={`absolute right-[75px] z-[60] flex items-center gap-0.5 rounded bg-black/90 text-xs backdrop-blur-md pointer-events-auto ${isDragging ? 'ring-2 ring-white/50' : ''}`}
              style={{
                top: `${yCoord - 10}px`,
                borderLeft: `3px solid ${line.color}`,
                boxShadow: `0 0 12px ${line.color}40`,
              }}
            >
              {/* Drag handle */}
              <div
                className="flex h-5 w-5 cursor-grab items-center justify-center rounded-l transition-all hover:bg-yellow-400/20 active:cursor-grabbing"
                title="Drag to move line (Delete to remove)"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDraggingHLine(line.id);
                  setSelectedDrawing({ type: 'hline', id: line.id });
                  if (chartRef.current) {
                    chartRef.current.applyOptions({
                      handleScroll: false,
                      handleScale: false,
                    });
                  }
                }}
              >
                <GripVertical className="h-3 w-3" style={{ color: line.color }} />
              </div>
              <span className="px-1 font-medium" style={{ color: line.color, textShadow: `0 0 8px ${line.color}` }}>${line.price.toFixed(2)}</span>
              <button
                onClick={(e) => { e.stopPropagation(); deleteHorizontalLine(line.id); }}
                className="flex h-5 w-5 items-center justify-center rounded-r text-white/50 hover:bg-red-500/30 hover:text-red-400"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        );
      })}

      {/* Trend Lines (SVG overlay) */}
      {trendLines.length > 0 && chartContainerRef.current && (
        <svg
          className="absolute inset-0 z-[60] pointer-events-none"
          style={{
            width: chartContainerRef.current.clientWidth,
            height: 500,
          }}
        >
          <defs>
            <filter id="trendlineGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {trendLines.map(line => {
            if (!chartRef.current || !candlestickSeriesRef.current) return null;

            // Convert time/price to coordinates
            const startX = chartRef.current.timeScale().timeToCoordinate(line.start.time as any);
            const startY = candlestickSeriesRef.current.priceToCoordinate(line.start.price);
            const endX = chartRef.current.timeScale().timeToCoordinate(line.end.time as any);
            const endY = candlestickSeriesRef.current.priceToCoordinate(line.end.price);

            if (startX === null || startY === null || endX === null || endY === null) return null;

            const isDragging = draggingTrendLine?.id === line.id;

            const handlePointDragStart = (point: 'start' | 'end') => (e: React.MouseEvent) => {
              e.preventDefault();
              e.stopPropagation();
              setDraggingTrendLine({ id: line.id, point });
              setSelectedDrawing({ type: 'trendline', id: line.id });
              if (chartRef.current) {
                chartRef.current.applyOptions({
                  handleScroll: false,
                  handleScale: false,
                });
              }
            };

            const handleLineDragStart = (e: React.MouseEvent) => {
              e.preventDefault();
              e.stopPropagation();
              setDraggingTrendLine({ id: line.id, point: 'whole' });
              setSelectedDrawing({ type: 'trendline', id: line.id });
              if (chartRef.current) {
                chartRef.current.applyOptions({
                  handleScroll: false,
                  handleScale: false,
                });
              }
            };

            return (
              <g key={line.id}>
                {/* Clickable/draggable line (wider hit area) */}
                <line
                  x1={startX}
                  y1={startY}
                  x2={endX}
                  y2={endY}
                  stroke="transparent"
                  strokeWidth={14}
                  style={{ pointerEvents: 'auto', cursor: 'move' }}
                  onMouseDown={handleLineDragStart}
                />
                {/* Visual line with neon glow */}
                <line
                  x1={startX}
                  y1={startY}
                  x2={endX}
                  y2={endY}
                  stroke={line.color}
                  strokeWidth={3}
                  strokeLinecap="round"
                  filter="url(#trendlineGlow)"
                  style={{ pointerEvents: 'none' }}
                  opacity={isDragging ? 0.7 : 1}
                />
                {/* Start point - draggable with glow */}
                <circle
                  cx={startX}
                  cy={startY}
                  r={8}
                  fill={line.color}
                  filter="url(#trendlineGlow)"
                  stroke={isDragging && draggingTrendLine?.point === 'start' ? '#fff' : 'transparent'}
                  strokeWidth={2}
                  style={{ pointerEvents: 'auto', cursor: 'grab' }}
                  onMouseDown={handlePointDragStart('start')}
                />
                {/* Start point inner highlight */}
                <circle cx={startX} cy={startY} r={3} fill="#fff" style={{ pointerEvents: 'none' }} />
                {/* End point - draggable with glow */}
                <circle
                  cx={endX}
                  cy={endY}
                  r={8}
                  fill={line.color}
                  filter="url(#trendlineGlow)"
                  stroke={isDragging && draggingTrendLine?.point === 'end' ? '#fff' : 'transparent'}
                  strokeWidth={2}
                  style={{ pointerEvents: 'auto', cursor: 'grab' }}
                  onMouseDown={handlePointDragStart('end')}
                />
                {/* End point inner highlight */}
                <circle cx={endX} cy={endY} r={3} fill="#fff" style={{ pointerEvents: 'none' }} />
              </g>
            );
          })}
        </svg>
      )}

      {/* Trend Line Labels */}
      {trendLines.map(line => {
        if (!chartRef.current || !candlestickSeriesRef.current) return null;

        const endX = chartRef.current.timeScale().timeToCoordinate(line.end.time as any);
        const endY = candlestickSeriesRef.current.priceToCoordinate(line.end.price);

        if (endX === null || endY === null) return null;

        return (
          <div
            key={`label-${line.id}`}
            className="absolute z-[70] flex items-center gap-1 rounded bg-black/80 px-2 py-0.5 text-xs backdrop-blur-sm pointer-events-auto"
            style={{
              left: `${endX + 10}px`,
              top: `${endY - 10}px`,
              borderLeft: `3px solid ${line.color}`,
            }}
          >
            <span style={{ color: line.color }}>Trend</span>
            <button
              onClick={(e) => { e.stopPropagation(); deleteTrendLine(line.id); }}
              className="ml-1 rounded p-0.5 text-white/50 hover:bg-red-500/30 hover:text-red-400"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        );
      })}

      {/* Rectangles (SVG overlay) */}
      {rectangles.length > 0 && chartContainerRef.current && (
        <svg
          className="absolute inset-0 z-[60] pointer-events-none"
          style={{
            width: chartContainerRef.current.clientWidth,
            height: 500,
          }}
        >
          <defs>
            <filter id="rectangleGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {rectangles.map(rect => {
            if (!chartRef.current || !candlestickSeriesRef.current) return null;

            const x1 = chartRef.current.timeScale().timeToCoordinate(rect.start.time as any);
            const y1 = candlestickSeriesRef.current.priceToCoordinate(rect.start.price);
            const x2 = chartRef.current.timeScale().timeToCoordinate(rect.end.time as any);
            const y2 = candlestickSeriesRef.current.priceToCoordinate(rect.end.price);

            if (x1 === null || y1 === null || x2 === null || y2 === null) return null;

            const left = Math.min(x1, x2);
            const top = Math.min(y1, y2);
            const width = Math.abs(x2 - x1);
            const height = Math.abs(y2 - y1);

            const isDragging = draggingRectangle?.id === rect.id;

            const handleCornerDragStart = (corner: 'start' | 'end') => (e: React.MouseEvent) => {
              e.preventDefault();
              e.stopPropagation();
              setDraggingRectangle({ id: rect.id, corner });
              setSelectedDrawing({ type: 'rectangle', id: rect.id });
              if (chartRef.current) {
                chartRef.current.applyOptions({ handleScroll: false, handleScale: false });
              }
            };

            const handleRectDragStart = (e: React.MouseEvent) => {
              e.preventDefault();
              e.stopPropagation();
              setDraggingRectangle({ id: rect.id, corner: 'whole' });
              setSelectedDrawing({ type: 'rectangle', id: rect.id });
              if (chartRef.current) {
                chartRef.current.applyOptions({ handleScroll: false, handleScale: false });
              }
            };

            return (
              <g key={rect.id}>
                {/* Invisible wider rect for easier dragging */}
                <rect
                  x={left}
                  y={top}
                  width={width}
                  height={height}
                  fill="transparent"
                  stroke="transparent"
                  strokeWidth={12}
                  style={{ pointerEvents: 'auto', cursor: 'move' }}
                  onMouseDown={handleRectDragStart}
                />
                {/* Visual rectangle with neon glow */}
                <rect
                  x={left}
                  y={top}
                  width={width}
                  height={height}
                  fill={`${rect.color}15`}
                  stroke={rect.color}
                  strokeWidth={3}
                  rx={4}
                  ry={4}
                  filter="url(#rectangleGlow)"
                  style={{ pointerEvents: 'none' }}
                  opacity={isDragging ? 0.7 : 1}
                />
                {/* Start corner handle with glow */}
                <circle
                  cx={x1}
                  cy={y1}
                  r={8}
                  fill={rect.color}
                  filter="url(#rectangleGlow)"
                  stroke={isDragging && draggingRectangle?.corner === 'start' ? '#fff' : 'transparent'}
                  strokeWidth={2}
                  style={{ pointerEvents: 'auto', cursor: 'grab' }}
                  onMouseDown={handleCornerDragStart('start')}
                />
                {/* Start corner inner highlight */}
                <circle cx={x1} cy={y1} r={3} fill="#fff" style={{ pointerEvents: 'none' }} />
                {/* End corner handle with glow */}
                <circle
                  cx={x2}
                  cy={y2}
                  r={8}
                  fill={rect.color}
                  filter="url(#rectangleGlow)"
                  stroke={isDragging && draggingRectangle?.corner === 'end' ? '#fff' : 'transparent'}
                  strokeWidth={2}
                  style={{ pointerEvents: 'auto', cursor: 'grab' }}
                  onMouseDown={handleCornerDragStart('end')}
                />
                {/* End corner inner highlight */}
                <circle cx={x2} cy={y2} r={3} fill="#fff" style={{ pointerEvents: 'none' }} />
              </g>
            );
          })}
        </svg>
      )}

      {/* Rectangle Labels */}
      {rectangles.map(rect => {
        if (!chartRef.current || !candlestickSeriesRef.current) return null;

        const x1 = chartRef.current.timeScale().timeToCoordinate(rect.start.time as any);
        const y1 = candlestickSeriesRef.current.priceToCoordinate(rect.start.price);

        if (x1 === null || y1 === null) return null;

        return (
          <div
            key={`label-${rect.id}`}
            className="absolute z-[70] flex items-center gap-1 rounded bg-black/80 px-2 py-0.5 text-xs backdrop-blur-sm pointer-events-auto"
            style={{
              left: `${x1 + 5}px`,
              top: `${y1 + 5}px`,
              borderLeft: `3px solid ${rect.color}`,
            }}
          >
            <span style={{ color: rect.color }}>Zone</span>
            <button
              onClick={(e) => { e.stopPropagation(); deleteRectangle(rect.id); }}
              className="ml-1 rounded p-0.5 text-white/50 hover:bg-red-500/30 hover:text-red-400"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        );
      })}

      {/* Circles/Ellipses (SVG overlay) */}
      {circles.length > 0 && chartContainerRef.current && (
        <svg
          className="absolute inset-0 z-[60] pointer-events-none"
          style={{
            width: chartContainerRef.current.clientWidth,
            height: 500,
          }}
        >
          <defs>
            <filter id="circleGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {circles.map(circle => {
            if (!chartRef.current || !candlestickSeriesRef.current) return null;

            const cx = chartRef.current.timeScale().timeToCoordinate(circle.center.time as any);
            const cy = candlestickSeriesRef.current.priceToCoordinate(circle.center.price);

            if (cx === null || cy === null) return null;

            const isDragging = draggingCircle?.id === circle.id;

            const handleCenterDragStart = (e: React.MouseEvent) => {
              e.preventDefault();
              e.stopPropagation();
              setDraggingCircle({ id: circle.id, part: 'center' });
              setSelectedDrawing({ type: 'circle', id: circle.id });
              if (chartRef.current) {
                chartRef.current.applyOptions({ handleScroll: false, handleScale: false });
              }
            };

            const handleRadiusDragStart = (e: React.MouseEvent) => {
              e.preventDefault();
              e.stopPropagation();
              setDraggingCircle({ id: circle.id, part: 'radius' });
              setSelectedDrawing({ type: 'circle', id: circle.id });
              if (chartRef.current) {
                chartRef.current.applyOptions({ handleScroll: false, handleScale: false });
              }
            };

            return (
              <g key={circle.id}>
                {/* Invisible wider ellipse for easier center dragging */}
                <ellipse
                  cx={cx}
                  cy={cy}
                  rx={circle.radiusX}
                  ry={circle.radiusY}
                  fill="transparent"
                  stroke="transparent"
                  strokeWidth={12}
                  style={{ pointerEvents: 'auto', cursor: 'move' }}
                  onMouseDown={handleCenterDragStart}
                />
                {/* Visual ellipse with neon glow */}
                <ellipse
                  cx={cx}
                  cy={cy}
                  rx={circle.radiusX}
                  ry={circle.radiusY}
                  fill={`${circle.color}15`}
                  stroke={circle.color}
                  strokeWidth={3}
                  filter="url(#circleGlow)"
                  style={{ pointerEvents: 'none' }}
                  opacity={isDragging ? 0.7 : 1}
                />
                {/* Center handle with glow */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={8}
                  fill={circle.color}
                  filter="url(#circleGlow)"
                  stroke={isDragging && draggingCircle?.part === 'center' ? '#fff' : 'transparent'}
                  strokeWidth={2}
                  style={{ pointerEvents: 'auto', cursor: 'grab' }}
                  onMouseDown={handleCenterDragStart}
                />
                {/* Center inner highlight */}
                <circle cx={cx} cy={cy} r={3} fill="#fff" style={{ pointerEvents: 'none' }} />
                {/* Radius handle (right edge) with glow */}
                <circle
                  cx={cx + circle.radiusX}
                  cy={cy}
                  r={8}
                  fill={circle.color}
                  filter="url(#circleGlow)"
                  stroke={isDragging && draggingCircle?.part === 'radius' ? '#fff' : 'transparent'}
                  strokeWidth={2}
                  style={{ pointerEvents: 'auto', cursor: 'ew-resize' }}
                  onMouseDown={handleRadiusDragStart}
                />
                {/* Radius inner highlight */}
                <circle cx={cx + circle.radiusX} cy={cy} r={3} fill="#fff" style={{ pointerEvents: 'none' }} />
              </g>
            );
          })}
        </svg>
      )}

      {/* Circle Labels */}
      {circles.map(circle => {
        if (!chartRef.current || !candlestickSeriesRef.current) return null;

        const cx = chartRef.current.timeScale().timeToCoordinate(circle.center.time as any);
        const cy = candlestickSeriesRef.current.priceToCoordinate(circle.center.price);

        if (cx === null || cy === null) return null;

        return (
          <div
            key={`label-${circle.id}`}
            className="absolute z-[70] flex items-center gap-1 rounded bg-black/80 px-2 py-0.5 text-xs backdrop-blur-sm pointer-events-auto"
            style={{
              left: `${cx + circle.radiusX + 5}px`,
              top: `${cy - 10}px`,
              borderLeft: `3px solid ${circle.color}`,
            }}
          >
            <span style={{ color: circle.color }}>Circle</span>
            <button
              onClick={(e) => { e.stopPropagation(); deleteCircle(circle.id); }}
              className="ml-1 rounded p-0.5 text-white/50 hover:bg-red-500/30 hover:text-red-400"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        );
      })}

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
