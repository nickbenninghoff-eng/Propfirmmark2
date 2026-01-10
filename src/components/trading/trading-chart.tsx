"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickSeries, HistogramSeries, LineSeries, createTextWatermark } from "lightweight-charts";
import { useMarketPrice, usePositions, useOrders, useUpdateOrder, useCancelOrder, useClosePosition, useSubmitOrder } from "@/hooks/use-trading-data";
import { toast } from "sonner";
import { X, GripVertical, TrendingUp, TrendingDown, Target, ShieldAlert, Trash2, Minus, MousePointer, Pencil, Square, Circle, BarChart3, Settings, ChevronRight, Activity, Palette, Grid3X3, Crosshair, Save, RotateCcw, ZoomIn, ZoomOut, Maximize2, Camera, ChevronDown, Search, GitFork, ArrowUpRight, Percent, Clock } from "lucide-react";

// Available trading symbols
const AVAILABLE_SYMBOLS = [
  { symbol: 'ESH25', name: 'E-mini S&P 500', shortName: 'ES' },
  { symbol: 'NQH25', name: 'E-mini Nasdaq', shortName: 'NQ' },
  { symbol: 'YMH25', name: 'E-mini Dow', shortName: 'YM' },
  { symbol: 'CLH25', name: 'Crude Oil', shortName: 'CL' },
  { symbol: 'GCJ25', name: 'Gold', shortName: 'GC' },
];

interface TradingChartProps {
  symbol: string;
  accountId: string;
  onSymbolChange?: (symbol: string) => void;
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

export default function TradingChart({ symbol, accountId, onSymbolChange }: TradingChartProps) {
  const rootContainerRef = useRef<HTMLDivElement>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const vwapSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const smaSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const emaSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const rsiSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const bbUpperSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const bbLowerSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const bbMiddleSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const macdLineSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const macdSignalSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const macdHistogramSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const rsiPaneRef = useRef<any>(null); // IPaneApi
  const macdPaneRef = useRef<any>(null); // IPaneApi
  const [isLoading, setIsLoading] = useState(true);
  const [showVolume, setShowVolume] = useState(true);
  const [showVWAP, setShowVWAP] = useState(false);
  const [showVolumeProfile, setShowVolumeProfile] = useState(false);
  const [volumeProfile, setVolumeProfile] = useState<{ price: number; volume: number; pct: number }[]>([]);
  const [volumeProfileRenderKey, setVolumeProfileRenderKey] = useState(0); // Force re-render on scale change
  const [showSMA, setShowSMA] = useState(false);
  const [smaPeriod, setSmaPeriod] = useState(20);
  const [showEMA, setShowEMA] = useState(false);
  const [emaPeriod, setEmaPeriod] = useState(9);
  const [showRSI, setShowRSI] = useState(false);
  const [rsiPeriod, setRsiPeriod] = useState(14);
  const [showBB, setShowBB] = useState(false);
  const [bbPeriod, setBbPeriod] = useState(20);
  const [bbStdDev, setBbStdDev] = useState(2);
  const [showMACD, setShowMACD] = useState(false);
  const [macdFast, setMacdFast] = useState(12);
  const [macdSlow, setMacdSlow] = useState(26);
  const [macdSignal, setMacdSignal] = useState(9);
  const [expandedGroup, setExpandedGroup] = useState<'indicators' | 'drawing' | 'settings' | null>('drawing');
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
  const candleDataRef = useRef<any[]>([]); // Store all candle data for volume recoloring
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

  // Chart controls state
  type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1D';
  const [timeframe, setTimeframe] = useState<Timeframe>('5m');
  const [autoScale, setAutoScale] = useState(true);

  // Ticker selector state
  const [tickerDropdownOpen, setTickerDropdownOpen] = useState(false);
  const [tickerSearch, setTickerSearch] = useState('');
  const tickerDropdownRef = useRef<HTMLDivElement>(null);

  // Timeframe selector state
  const [timeframeDropdownOpen, setTimeframeDropdownOpen] = useState(false);
  const timeframeDropdownRef = useRef<HTMLDivElement>(null);

  // Filter symbols based on search
  const filteredSymbols = AVAILABLE_SYMBOLS.filter(s =>
    s.symbol.toLowerCase().includes(tickerSearch.toLowerCase()) ||
    s.name.toLowerCase().includes(tickerSearch.toLowerCase()) ||
    s.shortName.toLowerCase().includes(tickerSearch.toLowerCase())
  );

  // Get current symbol info
  const currentSymbolInfo = AVAILABLE_SYMBOLS.find(s => s.symbol === symbol) || {
    symbol,
    name: symbol,
    shortName: symbol.slice(0, 2)
  };

  // Handle symbol selection
  const handleSymbolSelect = (newSymbol: string) => {
    if (onSymbolChange) {
      onSymbolChange(newSymbol);
    }
    setTickerDropdownOpen(false);
    setTickerSearch('');
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (tickerDropdownRef.current && !tickerDropdownRef.current.contains(e.target as Node)) {
        setTickerDropdownOpen(false);
        setTickerSearch('');
      }
      if (timeframeDropdownRef.current && !timeframeDropdownRef.current.contains(e.target as Node)) {
        setTimeframeDropdownOpen(false);
      }
    };
    if (tickerDropdownOpen || timeframeDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [tickerDropdownOpen, timeframeDropdownOpen]);

  // Convert timeframe to interval in minutes for API
  const timeframeToMinutes = (tf: Timeframe): number => {
    switch (tf) {
      case '1m': return 1;
      case '5m': return 5;
      case '15m': return 15;
      case '1h': return 60;
      case '4h': return 240;
      case '1D': return 1440;
      default: return 5;
    }
  };

  // Drawing tools state
  type DrawingMode = 'none' | 'horizontal' | 'trendline' | 'rectangle' | 'circle' | 'fibonacci' | 'pitchfork' | 'arrow';
  type LineStyle = 'solid' | 'dashed' | 'dotted';
  type LineWidth = 1 | 2 | 3 | 4;
  type TextPosition = 'left' | 'center' | 'right';
  type DrawingText = {
    content: string;
    size: number;       // Font size in px (10-24)
    bold: boolean;
    italic: boolean;
    underline: boolean;
    position: TextPosition;
  };
  const defaultText: DrawingText = { content: '', size: 12, bold: false, italic: false, underline: false, position: 'left' };

  const [drawingMode, setDrawingMode] = useState<DrawingMode>('none');
  const [horizontalLines, setHorizontalLines] = useState<{ id: string; price: number; color: string; style: LineStyle; width: LineWidth; text: DrawingText }[]>([]);
  const [trendLines, setTrendLines] = useState<{
    id: string;
    start: { time: number; price: number };
    end: { time: number; price: number };
    color: string;
    style: LineStyle;
    width: LineWidth;
    text: DrawingText;
  }[]>([]);
  const [rectangles, setRectangles] = useState<{
    id: string;
    start: { time: number; price: number };
    end: { time: number; price: number };
    color: string;
    text: DrawingText;
  }[]>([]);
  const [circles, setCircles] = useState<{
    id: string;
    center: { time: number; price: number };
    radiusX: number;
    radiusY: number;
    color: string;
    text: DrawingText;
  }[]>([]);
  const [fibonacciRetracements, setFibonacciRetracements] = useState<{
    id: string;
    start: { time: number; price: number };
    end: { time: number; price: number };
    color: string;
    levels: number[];
    text?: DrawingText;
  }[]>([]);
  const [pitchforks, setPitchforks] = useState<{
    id: string;
    p1: { time: number; price: number };
    p2: { time: number; price: number };
    p3: { time: number; price: number };
    color: string;
    text?: DrawingText;
  }[]>([]);
  const [arrows, setArrows] = useState<{
    id: string;
    start: { time: number; price: number };
    end: { time: number; price: number };
    color: string;
    label: string;
    text?: DrawingText;
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
  const [pendingFibonacci, setPendingFibonacci] = useState<{
    start: { time: number; price: number };
  } | null>(null);
  const [pendingPitchfork, setPendingPitchfork] = useState<{
    p1: { time: number; price: number };
    p2?: { time: number; price: number };
  } | null>(null);
  const [pendingArrow, setPendingArrow] = useState<{
    start: { time: number; price: number };
  } | null>(null);

  // Dragging state for drawings
  const [draggingHLine, setDraggingHLine] = useState<string | null>(null);
  const [draggingTrendLine, setDraggingTrendLine] = useState<{ id: string; point: 'start' | 'end' | 'whole' } | null>(null);
  const [draggingRectangle, setDraggingRectangle] = useState<{ id: string; corner: 'start' | 'end' | 'whole' } | null>(null);
  const [draggingCircle, setDraggingCircle] = useState<{ id: string; part: 'center' | 'radius' } | null>(null);
  const [draggingFibonacci, setDraggingFibonacci] = useState<{ id: string; point: 'start' | 'end' | 'whole' } | null>(null);
  const [draggingPitchfork, setDraggingPitchfork] = useState<{ id: string; point: 'p1' | 'p2' | 'p3' | 'whole' } | null>(null);
  const [draggingArrow, setDraggingArrow] = useState<{ id: string; point: 'start' | 'end' | 'whole' } | null>(null);

  // Active drawing state (for click-and-drag UX)
  const [activeDrawing, setActiveDrawing] = useState<{
    type: 'trendline' | 'rectangle' | 'circle' | 'fibonacci' | 'arrow';
    start: { time: number; price: number };
    startCoord: { x: number; y: number };
  } | null>(null);

  // Preview coordinates while drawing
  const [previewCoord, setPreviewCoord] = useState<{ x: number; y: number } | null>(null);

  // Selected drawing (for delete hotkey)
  const [selectedDrawing, setSelectedDrawing] = useState<{
    type: 'hline' | 'trendline' | 'rectangle' | 'circle' | 'fibonacci' | 'pitchfork' | 'arrow';
    id: string;
  } | null>(null);

  // Chart settings state
  const [chartSettings, setChartSettings] = useState({
    // Candlestick colors
    candleUpColor: '#4ade80',
    candleDownColor: '#fb7185',
    // Grid
    showGrid: true,
    gridOpacity: 0.08,
    // Crosshair
    crosshairMode: 'normal' as 'normal' | 'magnet' | 'hidden',
    // Volume colors
    volumeUpColor: '#4ade80',
    volumeDownColor: '#fb7185',
    // Drawing defaults
    defaultDrawingColor: '#facc15',
  });

  // Ref for chartSettings to access in effects without re-running
  const chartSettingsRef = useRef(chartSettings);
  chartSettingsRef.current = chartSettings;

  // Saved presets per drawing type (includes color, and style/width for lines)
  type DrawingType = 'hline' | 'trendline' | 'rectangle' | 'circle' | 'fibonacci' | 'pitchfork' | 'arrow';
  type DrawingPreset = {
    name: string;
    color: string;
    style?: LineStyle;  // Only for hline/trendline
    width?: LineWidth;  // Only for hline/trendline
    text?: DrawingText; // Text label settings
  };
  const [savedPresets, setSavedPresets] = useState<Record<DrawingType, DrawingPreset[]>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('chartSavedPresets');
      if (saved) {
        return JSON.parse(saved);
      }
    }
    // Default presets per type
    return {
      hline: [
        { name: 'HighOfDay', color: '#4ade80', style: 'solid', width: 2 },
        { name: 'LowOfDay', color: '#fb7185', style: 'solid', width: 2 },
      ],
      trendline: [
        { name: 'Support', color: '#22d3ee', style: 'solid', width: 2 },
        { name: 'Resistance', color: '#a855f7', style: 'dashed', width: 2 },
      ],
      rectangle: [],
      circle: [],
    };
  });

  // Save presets to localStorage when they change
  useEffect(() => {
    localStorage.setItem('chartSavedPresets', JSON.stringify(savedPresets));
  }, [savedPresets]);

  // State for adding new saved preset
  const [newPresetName, setNewPresetName] = useState('');

  // Helper to convert hex to rgba
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // Drawing context menu state
  const [drawingContextMenu, setDrawingContextMenu] = useState<{
    x: number;
    y: number;
    type: DrawingType;
    id: string;
  } | null>(null);
  const [contextMenuDragging, setContextMenuDragging] = useState<{ startX: number; startY: number; menuX: number; menuY: number } | null>(null);

  // Helper to open context menu at mouse position relative to root container
  // Ensures menu stays within chart bounds
  const openDrawingContextMenu = (e: React.MouseEvent, type: DrawingType, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (rootContainerRef.current) {
      const rect = rootContainerRef.current.getBoundingClientRect();
      const menuHeight = 550; // Approximate height of context menu
      const menuWidth = 220;  // Approximate width of context menu

      let x = e.clientX - rect.left;
      let y = e.clientY - rect.top;

      // Keep menu within horizontal bounds
      if (x + menuWidth > rect.width) {
        x = rect.width - menuWidth - 10;
      }

      // Keep menu within vertical bounds - if it would go off bottom, position above cursor
      if (y + menuHeight > rect.height) {
        y = Math.max(10, rect.height - menuHeight - 10);
      }

      setDrawingContextMenu({ x, y, type, id });
    }
  };

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
      height: 800,
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

    // Volume histogram series (below price chart)
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceScaleId: 'volume',
      color: '#4ade80',
      priceFormat: { type: 'volume' },
    });

    // Configure volume pane to be smaller (bottom 15% of chart)
    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });

    volumeSeriesRef.current = volumeSeries;

    // Create VWAP line series (hidden by default)
    const vwapSeries = chart.addSeries(LineSeries, {
      color: '#f59e0b', // Amber color for VWAP
      lineWidth: 2,
      lineStyle: 0, // Solid
      priceLineVisible: false,
      lastValueVisible: true,
      crosshairMarkerVisible: true,
      visible: false, // Hidden by default
    });
    vwapSeriesRef.current = vwapSeries;

    // Create SMA line series (hidden by default)
    const smaSeries = chart.addSeries(LineSeries, {
      color: '#22d3ee', // Cyan color for SMA
      lineWidth: 2,
      lineStyle: 0,
      priceLineVisible: false,
      lastValueVisible: true,
      crosshairMarkerVisible: true,
      visible: false,
    });
    smaSeriesRef.current = smaSeries;

    // Create EMA line series (hidden by default)
    const emaSeries = chart.addSeries(LineSeries, {
      color: '#a855f7', // Purple color for EMA
      lineWidth: 2,
      lineStyle: 0,
      priceLineVisible: false,
      lastValueVisible: true,
      crosshairMarkerVisible: true,
      visible: false,
    });
    emaSeriesRef.current = emaSeries;

    // RSI pane will be created dynamically when needed
    rsiPaneRef.current = null;
    rsiSeriesRef.current = null;

    // Create Bollinger Bands series (hidden by default)
    const bbUpperSeries = chart.addSeries(LineSeries, {
      color: 'rgba(251, 191, 36, 0.7)', // Amber for upper band
      lineWidth: 1,
      lineStyle: 0,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
      visible: false,
    });
    bbUpperSeriesRef.current = bbUpperSeries;

    const bbMiddleSeries = chart.addSeries(LineSeries, {
      color: 'rgba(251, 191, 36, 0.9)', // Amber for middle band (SMA)
      lineWidth: 1,
      lineStyle: 2, // Dashed
      priceLineVisible: false,
      lastValueVisible: true,
      crosshairMarkerVisible: true,
      visible: false,
    });
    bbMiddleSeriesRef.current = bbMiddleSeries;

    const bbLowerSeries = chart.addSeries(LineSeries, {
      color: 'rgba(251, 191, 36, 0.7)', // Amber for lower band
      lineWidth: 1,
      lineStyle: 0,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
      visible: false,
    });
    bbLowerSeriesRef.current = bbLowerSeries;

    // MACD pane will be created dynamically when needed
    macdPaneRef.current = null;
    macdLineSeriesRef.current = null;
    macdSignalSeriesRef.current = null;
    macdHistogramSeriesRef.current = null;

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

    // Subscribe to visible range changes to update Volume Profile positioning
    const handleVisibleRangeChange = () => {
      setVolumeProfileRenderKey(k => k + 1);
    };
    chart.timeScale().subscribeVisibleLogicalRangeChange(handleVisibleRangeChange);

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(handleVisibleRangeChange);
      chart.remove();
    };
  }, [symbol]);

  // Apply chart settings when they change
  useEffect(() => {
    if (!chartRef.current || !candlestickSeriesRef.current) return;

    // Apply candlestick colors
    candlestickSeriesRef.current.applyOptions({
      upColor: chartSettings.candleUpColor,
      downColor: chartSettings.candleDownColor,
      wickUpColor: chartSettings.candleUpColor,
      wickDownColor: chartSettings.candleDownColor,
    });

    // Apply grid settings
    const gridColor = chartSettings.showGrid ? 0.08 : 0;
    chartRef.current.applyOptions({
      grid: {
        vertLines: { color: `rgba(168, 85, 247, ${gridColor})` },
        horzLines: { color: `rgba(34, 211, 238, ${gridColor})` },
      },
      crosshair: chartSettings.crosshairMode === 'hidden' ? {
        mode: 0,
        vertLine: { visible: false },
        horzLine: { visible: false },
      } : {
        mode: chartSettings.crosshairMode === 'magnet' ? 1 : 0,
        vertLine: {
          visible: true,
          color: "rgba(168, 85, 247, 0.5)",
          width: 1,
          style: 2,
          labelBackgroundColor: "#a855f7",
        },
        horzLine: {
          visible: true,
          color: "rgba(34, 211, 238, 0.5)",
          width: 1,
          style: 2,
          labelBackgroundColor: "#22d3ee",
        },
      },
    });

    // Recolor volume bars when volume colors change
    if (volumeSeriesRef.current && candleDataRef.current.length > 0) {
      const volumeData = candleDataRef.current.map((candle: any) => ({
        time: candle.time,
        value: candle.volume || 0,
        color: candle.close >= candle.open
          ? hexToRgba(chartSettings.volumeUpColor, 0.5)
          : hexToRgba(chartSettings.volumeDownColor, 0.5),
      }));
      volumeSeriesRef.current.setData(volumeData);
    }
  }, [chartSettings]);

  // Sync indicator visibility with state
  useEffect(() => {
    if (smaSeriesRef.current) {
      smaSeriesRef.current.applyOptions({ visible: showSMA });
    }
  }, [showSMA]);

  useEffect(() => {
    if (emaSeriesRef.current) {
      emaSeriesRef.current.applyOptions({ visible: showEMA });
    }
  }, [showEMA]);

  useEffect(() => {
    console.log('[RSI Toggle] showRSI:', showRSI, 'chartRef:', !!chartRef.current);
    if (!chartRef.current) return;

    if (showRSI && !rsiPaneRef.current) {
      // Create RSI pane
      console.log('[RSI] Creating RSI pane');
      const rsiPane = chartRef.current.addPane();
      rsiPaneRef.current = rsiPane;

      // Add RSI series to the pane
      const rsiSeries = rsiPane.addSeries(LineSeries, {
        color: '#f472b6', // Pink color for RSI
        lineWidth: 2,
        lineStyle: 0,
        priceLineVisible: false,
        lastValueVisible: true,
        crosshairMarkerVisible: true,
        priceFormat: {
          type: 'custom',
          formatter: (price: number) => price.toFixed(0),
        },
      });
      rsiSeriesRef.current = rsiSeries;

      // Calculate and set RSI data if we have candle data
      if (candleDataRef.current.length > 0) {
        const gains: number[] = [];
        const losses: number[] = [];
        const rsiData: { time: any; value: number }[] = [];

        for (let i = 1; i < candleDataRef.current.length; i++) {
          const change = candleDataRef.current[i].close - candleDataRef.current[i - 1].close;
          gains.push(change > 0 ? change : 0);
          losses.push(change < 0 ? -change : 0);

          if (i >= rsiPeriod) {
            const avgGain = gains.slice(i - rsiPeriod, i).reduce((a, b) => a + b, 0) / rsiPeriod;
            const avgLoss = losses.slice(i - rsiPeriod, i).reduce((a, b) => a + b, 0) / rsiPeriod;
            const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
            const rsi = 100 - (100 / (1 + rs));
            rsiData.push({ time: candleDataRef.current[i].time, value: rsi });
          }
        }
        console.log('[RSI] Setting data:', rsiData.length, 'points');
        rsiSeries.setData(rsiData);
      }

      chartRef.current.timeScale().fitContent();
    } else if (!showRSI && rsiPaneRef.current) {
      // Remove RSI pane
      console.log('[RSI] Removing RSI pane');
      const panes = chartRef.current.panes();
      const paneIndex = panes.indexOf(rsiPaneRef.current);
      if (paneIndex > 0) { // Don't remove the main pane (index 0)
        chartRef.current.removePane(paneIndex);
      }
      rsiPaneRef.current = null;
      rsiSeriesRef.current = null;
    }
  }, [showRSI, rsiPeriod]);

  useEffect(() => {
    if (bbUpperSeriesRef.current && bbMiddleSeriesRef.current && bbLowerSeriesRef.current) {
      bbUpperSeriesRef.current.applyOptions({ visible: showBB });
      bbMiddleSeriesRef.current.applyOptions({ visible: showBB });
      bbLowerSeriesRef.current.applyOptions({ visible: showBB });
    }
  }, [showBB]);

  useEffect(() => {
    if (vwapSeriesRef.current) {
      vwapSeriesRef.current.applyOptions({ visible: showVWAP });
    }
  }, [showVWAP]);

  useEffect(() => {
    console.log('[MACD Toggle] showMACD:', showMACD, 'chartRef:', !!chartRef.current);
    if (!chartRef.current) return;

    if (showMACD && !macdPaneRef.current) {
      // Create MACD pane
      console.log('[MACD] Creating MACD pane');
      const macdPane = chartRef.current.addPane();
      macdPaneRef.current = macdPane;

      // Add MACD histogram series first (so it renders behind the lines)
      const macdHistogramSeries = macdPane.addSeries(HistogramSeries, {
        color: '#22c55e',
        priceFormat: { type: 'price', precision: 2 },
      });
      macdHistogramSeriesRef.current = macdHistogramSeries;

      // Add MACD line series
      const macdLineSeries = macdPane.addSeries(LineSeries, {
        color: '#3b82f6', // Blue for MACD line
        lineWidth: 2,
        lineStyle: 0,
        priceLineVisible: false,
        lastValueVisible: true,
        crosshairMarkerVisible: true,
      });
      macdLineSeriesRef.current = macdLineSeries;

      // Add Signal line series
      const macdSignalSeries = macdPane.addSeries(LineSeries, {
        color: '#f97316', // Orange for signal line
        lineWidth: 2,
        lineStyle: 0,
        priceLineVisible: false,
        lastValueVisible: true,
        crosshairMarkerVisible: true,
      });
      macdSignalSeriesRef.current = macdSignalSeries;

      // Calculate and set MACD data if we have candle data
      if (candleDataRef.current.length > 0) {
        const closes = candleDataRef.current.map((c: any) => c.close);

        // Calculate fast EMA
        const fastMultiplier = 2 / (macdFast + 1);
        let fastEma: number | null = null;
        const fastEmaValues: number[] = [];

        for (let i = 0; i < closes.length; i++) {
          if (i < macdFast - 1) {
            fastEmaValues.push(0);
          } else if (fastEma === null) {
            fastEma = closes.slice(0, macdFast).reduce((a: number, b: number) => a + b, 0) / macdFast;
            fastEmaValues.push(fastEma);
          } else {
            fastEma = (closes[i] - fastEma) * fastMultiplier + fastEma;
            fastEmaValues.push(fastEma);
          }
        }

        // Calculate slow EMA
        const slowMultiplier = 2 / (macdSlow + 1);
        let slowEma: number | null = null;
        const slowEmaValues: number[] = [];

        for (let i = 0; i < closes.length; i++) {
          if (i < macdSlow - 1) {
            slowEmaValues.push(0);
          } else if (slowEma === null) {
            slowEma = closes.slice(0, macdSlow).reduce((a: number, b: number) => a + b, 0) / macdSlow;
            slowEmaValues.push(slowEma);
          } else {
            slowEma = (closes[i] - slowEma) * slowMultiplier + slowEma;
            slowEmaValues.push(slowEma);
          }
        }

        // Calculate MACD line
        const macdValues: number[] = [];
        for (let i = 0; i < closes.length; i++) {
          if (i < macdSlow - 1) {
            macdValues.push(0);
          } else {
            macdValues.push(fastEmaValues[i] - slowEmaValues[i]);
          }
        }

        // Calculate Signal line
        const signalMultiplier = 2 / (macdSignal + 1);
        let signalEma: number | null = null;
        const signalValues: number[] = [];
        const startIndex = macdSlow - 1;

        for (let i = 0; i < closes.length; i++) {
          if (i < startIndex + macdSignal - 1) {
            signalValues.push(0);
          } else if (signalEma === null) {
            signalEma = macdValues.slice(startIndex, startIndex + macdSignal).reduce((a, b) => a + b, 0) / macdSignal;
            signalValues.push(signalEma);
          } else {
            signalEma = (macdValues[i] - signalEma) * signalMultiplier + signalEma;
            signalValues.push(signalEma);
          }
        }

        // Build data arrays
        const macdLineData: { time: any; value: number }[] = [];
        const macdSignalData: { time: any; value: number }[] = [];
        const macdHistogramData: { time: any; value: number; color: string }[] = [];

        for (let i = startIndex + macdSignal - 1; i < candleDataRef.current.length; i++) {
          const time = candleDataRef.current[i].time;
          const macdValue = macdValues[i];
          const signalValue = signalValues[i];
          const histogram = macdValue - signalValue;

          macdLineData.push({ time, value: macdValue });
          macdSignalData.push({ time, value: signalValue });
          macdHistogramData.push({
            time,
            value: histogram,
            color: histogram >= 0 ? '#22c55e' : '#ef4444',
          });
        }

        console.log('[MACD] Setting data:', macdLineData.length, 'points');
        macdLineSeries.setData(macdLineData);
        macdSignalSeries.setData(macdSignalData);
        macdHistogramSeries.setData(macdHistogramData);
      }

      chartRef.current.timeScale().fitContent();
    } else if (!showMACD && macdPaneRef.current) {
      // Remove MACD pane
      console.log('[MACD] Removing MACD pane');
      const panes = chartRef.current.panes();
      const paneIndex = panes.indexOf(macdPaneRef.current);
      if (paneIndex > 0) {
        chartRef.current.removePane(paneIndex);
      }
      macdPaneRef.current = null;
      macdLineSeriesRef.current = null;
      macdSignalSeriesRef.current = null;
      macdHistogramSeriesRef.current = null;
    }
  }, [showMACD, macdFast, macdSlow, macdSignal]);

  // Note: Pane layout is now handled automatically by lightweight-charts v5
  // when using addPane() to create separate indicator panes

  // Fetch and set candle data
  useEffect(() => {
    async function fetchCandles() {
      try {
        setIsLoading(true);
        const interval = timeframeToMinutes(timeframe);
        const res = await fetch(`/api/market-data/candles?symbol=${symbol}&interval=${interval}&count=100`);
        const data = await res.json();

        if (data.success && candlestickSeriesRef.current) {
          candlestickSeriesRef.current.setData(data.candles);

          // Store candle data for volume recoloring
          candleDataRef.current = data.candles;

          // Set volume data with directional colors from settings
          if (volumeSeriesRef.current) {
            const settings = chartSettingsRef.current;
            const volumeData = data.candles.map((candle: any) => ({
              time: candle.time,
              value: candle.volume || 0,
              color: candle.close >= candle.open
                ? hexToRgba(settings.volumeUpColor, 0.5)
                : hexToRgba(settings.volumeDownColor, 0.5),
            }));
            volumeSeriesRef.current.setData(volumeData);
          }

          // Calculate and set VWAP data
          if (vwapSeriesRef.current) {
            let cumulativeVP = 0; // Cumulative (Volume * Typical Price)
            let cumulativeVolume = 0;
            const vwapData = data.candles.map((candle: any) => {
              const typicalPrice = (candle.high + candle.low + candle.close) / 3;
              const volume = candle.volume || 1;
              cumulativeVP += typicalPrice * volume;
              cumulativeVolume += volume;
              return {
                time: candle.time,
                value: cumulativeVP / cumulativeVolume,
              };
            });
            console.log('[VWAP Debug] Calculated VWAP data:', {
              dataPoints: vwapData.length,
              firstValue: vwapData[0]?.value?.toFixed(2),
              lastValue: vwapData[vwapData.length - 1]?.value?.toFixed(2),
              cumulativeVolume,
            });
            vwapSeriesRef.current.setData(vwapData);
          }

          // Calculate and set SMA data
          if (smaSeriesRef.current) {
            const closes = data.candles.map((c: any) => c.close);
            const smaData = data.candles.map((candle: any, i: number) => {
              if (i < smaPeriod - 1) return null;
              const sum = closes.slice(i - smaPeriod + 1, i + 1).reduce((a: number, b: number) => a + b, 0);
              return {
                time: candle.time,
                value: sum / smaPeriod,
              };
            }).filter(Boolean);
            smaSeriesRef.current.setData(smaData);
          }

          // Calculate and set EMA data
          if (emaSeriesRef.current) {
            const multiplier = 2 / (emaPeriod + 1);
            let ema: number | null = null;
            const emaData = data.candles.map((candle: any, i: number) => {
              if (i < emaPeriod - 1) return null;
              if (ema === null) {
                // First EMA is just SMA
                const sum = data.candles.slice(0, emaPeriod).reduce((a: number, c: any) => a + c.close, 0);
                ema = sum / emaPeriod;
              } else {
                ema = (candle.close - ema) * multiplier + ema;
              }
              return {
                time: candle.time,
                value: ema,
              };
            }).filter(Boolean);
            emaSeriesRef.current.setData(emaData);
          }

          // Note: RSI data is calculated when the RSI pane is created

          // Calculate and set Bollinger Bands data
          if (bbUpperSeriesRef.current && bbMiddleSeriesRef.current && bbLowerSeriesRef.current) {
            const closes = data.candles.map((c: any) => c.close);
            const bbUpperData: { time: any; value: number }[] = [];
            const bbMiddleData: { time: any; value: number }[] = [];
            const bbLowerData: { time: any; value: number }[] = [];

            for (let i = bbPeriod - 1; i < data.candles.length; i++) {
              const slice = closes.slice(i - bbPeriod + 1, i + 1);
              const sma = slice.reduce((a: number, b: number) => a + b, 0) / bbPeriod;
              const squaredDiffs = slice.map((v: number) => Math.pow(v - sma, 2));
              const variance = squaredDiffs.reduce((a: number, b: number) => a + b, 0) / bbPeriod;
              const stdDev = Math.sqrt(variance);

              bbMiddleData.push({ time: data.candles[i].time, value: sma });
              bbUpperData.push({ time: data.candles[i].time, value: sma + bbStdDev * stdDev });
              bbLowerData.push({ time: data.candles[i].time, value: sma - bbStdDev * stdDev });
            }

            bbUpperSeriesRef.current.setData(bbUpperData);
            bbMiddleSeriesRef.current.setData(bbMiddleData);
            bbLowerSeriesRef.current.setData(bbLowerData);
          }

          // Note: MACD data is calculated when the MACD pane is created

          // Calculate Volume Profile (volume at each price level)
          const priceVolumes: Map<number, number> = new Map();
          const tickSize = symbol.startsWith('CL') ? 0.05 : symbol.startsWith('GC') ? 1 : 0.5;
          let totalVolume = 0;

          data.candles.forEach((candle: any) => {
            // Distribute volume across the candle's price range
            const low = Math.floor(candle.low / tickSize) * tickSize;
            const high = Math.ceil(candle.high / tickSize) * tickSize;
            const numLevels = Math.max(1, Math.round((high - low) / tickSize));
            const volumePerLevel = (candle.volume || 0) / numLevels;

            for (let price = low; price <= high; price += tickSize) {
              const roundedPrice = Math.round(price * 100) / 100;
              priceVolumes.set(roundedPrice, (priceVolumes.get(roundedPrice) || 0) + volumePerLevel);
              totalVolume += volumePerLevel;
            }
          });

          // Convert to array and sort by price
          const maxVolume = Math.max(...priceVolumes.values());
          const profileData = Array.from(priceVolumes.entries())
            .map(([price, volume]) => ({
              price,
              volume,
              pct: maxVolume > 0 ? (volume / maxVolume) * 100 : 0,
            }))
            .sort((a, b) => b.price - a.price);

          console.log('[Volume Profile Debug] Calculated profile:', {
            totalLevels: profileData.length,
            maxVolume: maxVolume.toFixed(0),
            priceRange: profileData.length > 0 ? `$${profileData[profileData.length - 1]?.price?.toFixed(2)} - $${profileData[0]?.price?.toFixed(2)}` : 'N/A',
            highVolumeLevels: profileData.filter(l => l.pct > 70).length,
          });
          setVolumeProfile(profileData);

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
  }, [symbol, timeframe]);

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

      // Update candleDataRef for volume recoloring
      const fullCandle = { ...candle, volume: serverCandle.volume || 0 };
      const existingIdx = candleDataRef.current.findIndex((c: any) => c.time === serverCandle.time);
      if (existingIdx >= 0) {
        candleDataRef.current[existingIdx] = fullCandle;
      } else {
        candleDataRef.current.push(fullCandle);
      }

      // Update volume bar in real-time with current settings
      if (volumeSeriesRef.current) {
        const settings = chartSettingsRef.current;
        volumeSeriesRef.current.update({
          time: serverCandle.time,
          value: serverCandle.volume || 0,
          color: serverCandle.close >= serverCandle.open
            ? hexToRgba(settings.volumeUpColor, 0.5)
            : hexToRgba(settings.volumeDownColor, 0.5),
        });
      }
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
        setPendingFibonacci(null);
        setPendingPitchfork(null);
        setPendingArrow(null);
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
          } else if (selectedDrawing.type === 'fibonacci') {
            deleteFibonacci(selectedDrawing.id);
          } else if (selectedDrawing.type === 'pitchfork') {
            deletePitchfork(selectedDrawing.id);
          } else if (selectedDrawing.type === 'arrow') {
            deleteArrow(selectedDrawing.id);
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
      } else if (e.key === 'f' || e.key === 'F') {
        if (drawingMode === 'none') {
          setDrawingMode('fibonacci');
        }
      } else if (e.key === 'p' || e.key === 'P') {
        if (drawingMode === 'none') {
          setDrawingMode('pitchfork');
        }
      } else if (e.key === 'a' || e.key === 'A') {
        if (drawingMode === 'none') {
          setDrawingMode('arrow');
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
        color: chartSettings.defaultDrawingColor,
        style: 'dashed' as LineStyle,
        width: 2 as LineWidth,
        text: { ...defaultText },
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
    } else if (drawingMode === 'fibonacci' && time !== null) {
      // Start drawing Fibonacci retracement
      setActiveDrawing({
        type: 'fibonacci',
        start: { time: time as number, price },
        startCoord: { x, y },
      });
      setPendingFibonacci({ start: { time: time as number, price } });
      chartRef.current.applyOptions({ handleScroll: false, handleScale: false });
    } else if (drawingMode === 'pitchfork' && time !== null) {
      // Pitchfork needs 3 clicks
      if (!pendingPitchfork) {
        // First point (anchor)
        setPendingPitchfork({ p1: { time: time as number, price } });
        toast.info('Click to set second point');
      } else if (!pendingPitchfork.p2) {
        // Second point
        setPendingPitchfork({ ...pendingPitchfork, p2: { time: time as number, price } });
        toast.info('Click to set third point');
      } else {
        // Third point - complete the pitchfork
        const newPitchfork = {
          id: `pitchfork-${Date.now()}`,
          p1: pendingPitchfork.p1,
          p2: pendingPitchfork.p2,
          p3: { time: time as number, price },
          color: chartSettings.defaultDrawingColor,
        };
        setPitchforks(prev => [...prev, newPitchfork]);
        toast.success('Pitchfork drawn');
        setPendingPitchfork(null);
        setDrawingMode('none');
      }
    } else if (drawingMode === 'arrow' && time !== null) {
      // Start drawing arrow
      setActiveDrawing({
        type: 'arrow',
        start: { time: time as number, price },
        startCoord: { x, y },
      });
      setPendingArrow({ start: { time: time as number, price } });
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
            color: chartSettings.defaultDrawingColor,
            style: 'solid' as LineStyle,
            width: 2 as LineWidth,
            text: { ...defaultText },
          };
          setTrendLines(prev => [...prev, newTrendLine]);
          toast.success('Trend line drawn');
        } else if (activeDrawing.type === 'rectangle') {
          const newRectangle = {
            id: `rect-${Date.now()}`,
            start: activeDrawing.start,
            end: { time: time as number, price },
            color: chartSettings.defaultDrawingColor,
            text: { ...defaultText },
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
              color: '#22d3ee', // Cyan default for circles
              text: { ...defaultText },
            };
            setCircles(prev => [...prev, newCircle]);
            toast.success('Circle/Ellipse drawn');
          }
        } else if (activeDrawing.type === 'fibonacci') {
          const newFibonacci = {
            id: `fib-${Date.now()}`,
            start: activeDrawing.start,
            end: { time: time as number, price },
            color: chartSettings.defaultDrawingColor,
            levels: [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1],
          };
          setFibonacciRetracements(prev => [...prev, newFibonacci]);
          toast.success('Fibonacci retracement drawn');
        } else if (activeDrawing.type === 'arrow') {
          const newArrow = {
            id: `arrow-${Date.now()}`,
            start: activeDrawing.start,
            end: { time: time as number, price },
            color: chartSettings.defaultDrawingColor,
            label: '',
          };
          setArrows(prev => [...prev, newArrow]);
          toast.success('Arrow drawn');
        }
      }

      // Clean up
      setActiveDrawing(null);
      setPreviewCoord(null);
      setPendingTrendLine(null);
      setPendingRectangle(null);
      setPendingCircle(null);
      setPendingFibonacci(null);
      setPendingArrow(null);
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

  // Track mouse for pitchfork multi-click preview
  useEffect(() => {
    if (drawingMode !== 'pitchfork' || !pendingPitchfork || !chartContainerRef.current) return;

    const container = chartContainerRef.current;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setPreviewCoord({ x, y });
    };

    container.addEventListener('mousemove', handleMouseMove);

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
    };
  }, [drawingMode, pendingPitchfork]);

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

  // Delete a fibonacci retracement
  const deleteFibonacci = (id: string) => {
    setFibonacciRetracements(prev => prev.filter(fib => fib.id !== id));
  };

  // Delete a pitchfork
  const deletePitchfork = (id: string) => {
    setPitchforks(prev => prev.filter(p => p.id !== id));
  };

  // Delete an arrow
  const deleteArrow = (id: string) => {
    setArrows(prev => prev.filter(a => a.id !== id));
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

  // Handle global mouse events for Fibonacci dragging
  useEffect(() => {
    if (!draggingFibonacci || !chartRef.current || !chartContainerRef.current) return;

    const container = chartContainerRef.current;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (candlestickSeriesRef.current && chartRef.current) {
        const newPrice = candlestickSeriesRef.current.coordinateToPrice(y);
        const newTime = chartRef.current.timeScale().coordinateToTime(x);

        if (newPrice !== null && newTime !== null) {
          setFibonacciRetracements(prev => prev.map(fib => {
            if (fib.id !== draggingFibonacci.id) return fib;

            if (draggingFibonacci.point === 'start') {
              return { ...fib, start: { time: newTime as number, price: newPrice } };
            } else if (draggingFibonacci.point === 'end') {
              return { ...fib, end: { time: newTime as number, price: newPrice } };
            } else {
              // Whole drawing - move both points
              const dx = newTime as number - fib.start.time;
              const dy = newPrice - fib.start.price;
              return {
                ...fib,
                start: { time: fib.start.time + dx * 0.1, price: fib.start.price + dy * 0.1 },
                end: { time: fib.end.time + dx * 0.1, price: fib.end.price + dy * 0.1 },
              };
            }
          }));
        }
      }
      e.preventDefault();
    };

    const handleMouseUp = () => {
      setDraggingFibonacci(null);
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
  }, [draggingFibonacci]);

  // Handle global mouse events for Pitchfork dragging
  useEffect(() => {
    if (!draggingPitchfork || !chartRef.current || !chartContainerRef.current) return;

    const container = chartContainerRef.current;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (candlestickSeriesRef.current && chartRef.current) {
        const newPrice = candlestickSeriesRef.current.coordinateToPrice(y);
        const newTime = chartRef.current.timeScale().coordinateToTime(x);

        if (newPrice !== null && newTime !== null) {
          setPitchforks(prev => prev.map(pf => {
            if (pf.id !== draggingPitchfork.id) return pf;

            if (draggingPitchfork.point === 'p1') {
              return { ...pf, p1: { time: newTime as number, price: newPrice } };
            } else if (draggingPitchfork.point === 'p2') {
              return { ...pf, p2: { time: newTime as number, price: newPrice } };
            } else if (draggingPitchfork.point === 'p3') {
              return { ...pf, p3: { time: newTime as number, price: newPrice } };
            } else {
              // Whole drawing
              const dx = (newTime as number - pf.p1.time) * 0.1;
              const dy = (newPrice - pf.p1.price) * 0.1;
              return {
                ...pf,
                p1: { time: pf.p1.time + dx, price: pf.p1.price + dy },
                p2: { time: pf.p2.time + dx, price: pf.p2.price + dy },
                p3: { time: pf.p3.time + dx, price: pf.p3.price + dy },
              };
            }
          }));
        }
      }
      e.preventDefault();
    };

    const handleMouseUp = () => {
      setDraggingPitchfork(null);
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
  }, [draggingPitchfork]);

  // Handle global mouse events for Arrow dragging
  useEffect(() => {
    if (!draggingArrow || !chartRef.current || !chartContainerRef.current) return;

    const container = chartContainerRef.current;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (candlestickSeriesRef.current && chartRef.current) {
        const newPrice = candlestickSeriesRef.current.coordinateToPrice(y);
        const newTime = chartRef.current.timeScale().coordinateToTime(x);

        if (newPrice !== null && newTime !== null) {
          setArrows(prev => prev.map(arrow => {
            if (arrow.id !== draggingArrow.id) return arrow;

            if (draggingArrow.point === 'start') {
              return { ...arrow, start: { time: newTime as number, price: newPrice } };
            } else if (draggingArrow.point === 'end') {
              return { ...arrow, end: { time: newTime as number, price: newPrice } };
            } else {
              // Whole drawing
              const dx = (newTime as number - arrow.start.time) * 0.1;
              const dy = (newPrice - arrow.start.price) * 0.1;
              return {
                ...arrow,
                start: { time: arrow.start.time + dx, price: arrow.start.price + dy },
                end: { time: arrow.end.time + dx, price: arrow.end.price + dy },
              };
            }
          }));
        }
      }
      e.preventDefault();
    };

    const handleMouseUp = () => {
      setDraggingArrow(null);
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
  }, [draggingArrow]);

  // Handle context menu dragging
  useEffect(() => {
    if (!contextMenuDragging || !drawingContextMenu) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - contextMenuDragging.startX;
      const dy = e.clientY - contextMenuDragging.startY;
      setDrawingContextMenu(prev => prev ? {
        ...prev,
        x: contextMenuDragging.menuX + dx,
        y: contextMenuDragging.menuY + dy,
      } : null);
    };

    const handleMouseUp = () => {
      setContextMenuDragging(null);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [contextMenuDragging, drawingContextMenu]);

  // Clear all drawings
  const clearAllDrawings = () => {
    setHorizontalLines([]);
    setTrendLines([]);
    setRectangles([]);
    setCircles([]);
    setFibonacciRetracements([]);
    setPitchforks([]);
    setArrows([]);
    setPendingTrendLine(null);
    setPendingRectangle(null);
    setPendingCircle(null);
    setPendingFibonacci(null);
    setPendingPitchfork(null);
    setPendingArrow(null);
    setActiveDrawing(null);
    toast.success('All drawings cleared');
  };

  // Count total drawings
  const totalDrawings = horizontalLines.length + trendLines.length + rectangles.length + circles.length + fibonacciRetracements.length + pitchforks.length + arrows.length;

  // Get cursor style based on drawing mode
  const getChartCursor = () => {
    if (draggingOrder || draggingTPSL || draggingHLine || draggingTrendLine || draggingRectangle || draggingCircle || draggingFibonacci || draggingPitchfork || draggingArrow || activeDrawing) return 'grabbing';
    if (drawingMode !== 'none') return 'crosshair';
    return 'default';
  };

  // Toggle group expansion
  const toggleGroup = (group: 'indicators' | 'drawing' | 'settings') => {
    setExpandedGroup(expandedGroup === group ? null : group);
  };

  return (
    <div
      ref={rootContainerRef}
      className="relative overflow-hidden rounded-xl"
      style={{
        background: 'linear-gradient(135deg, rgba(15, 5, 25, 0.95) 0%, rgba(10, 10, 20, 0.98) 50%, rgba(5, 15, 25, 0.95) 100%)',
        boxShadow: 'inset 0 0 100px rgba(168, 85, 247, 0.05), inset 0 0 60px rgba(34, 211, 238, 0.03), 0 0 40px rgba(168, 85, 247, 0.1)',
        border: '1px solid rgba(168, 85, 247, 0.2)',
      }}
    >
      <div className="relative">
        {/* Left Sidebar - Overlays chart (top-11 clears the toolbar) */}
        <div className="absolute left-0 top-11 bottom-0 flex flex-col bg-black/90 border-r border-purple-500/20 backdrop-blur-md z-[100]">
          {/* Indicators Group */}
          <div className="border-b border-purple-500/20">
            <button
              onClick={() => toggleGroup('indicators')}
              className={`flex items-center gap-2 w-full p-3 transition-all duration-200 ${
                expandedGroup === 'indicators'
                  ? 'bg-cyan-500/20 text-cyan-300'
                  : 'text-white/60 hover:bg-white/5 hover:text-white/80'
              }`}
              title="Indicators"
            >
              <BarChart3 className="h-5 w-5" />
              {expandedGroup === 'indicators' && (
                <span className="text-sm font-medium">Indicators</span>
              )}
              {expandedGroup === 'indicators' && (
                <ChevronRight className="h-4 w-4 ml-auto rotate-90" />
              )}
            </button>
            {expandedGroup === 'indicators' && (
              <div className="pb-2 px-2 space-y-1">
                <button
                  onClick={() => {
                    setShowVolume(!showVolume);
                    if (volumeSeriesRef.current) {
                      volumeSeriesRef.current.applyOptions({
                        visible: !showVolume,
                      });
                    }
                  }}
                  className={`flex items-center gap-2 w-full px-3 py-2 rounded text-sm transition-all duration-200 ${
                    showVolume
                      ? 'bg-cyan-500/20 text-cyan-300 shadow-sm shadow-cyan-500/20'
                      : 'text-white/50 hover:bg-white/5 hover:text-white/70'
                  }`}
                >
                  <Activity className="h-4 w-4" />
                  <span>Volume</span>
                </button>
                <button
                  onClick={() => {
                    const newShow = !showVWAP;
                    console.log('[VWAP Toggle]', newShow ? 'Enabled' : 'Disabled', {
                      hasSeriesRef: !!vwapSeriesRef.current,
                    });
                    setShowVWAP(newShow);
                    if (vwapSeriesRef.current) {
                      vwapSeriesRef.current.applyOptions({
                        visible: newShow,
                      });
                    }
                  }}
                  className={`flex items-center gap-2 w-full px-3 py-2 rounded text-sm transition-all duration-200 ${
                    showVWAP
                      ? 'bg-amber-500/20 text-amber-300 shadow-sm shadow-amber-500/20'
                      : 'text-white/50 hover:bg-white/5 hover:text-white/70'
                  }`}
                >
                  <TrendingUp className="h-4 w-4" />
                  <span>VWAP</span>
                </button>
                <button
                  onClick={() => {
                    const newShow = !showVolumeProfile;
                    console.log('[Volume Profile Toggle]', newShow ? 'Enabled' : 'Disabled', {
                      profileLevels: volumeProfile.length,
                      hasCandlestickSeries: !!candlestickSeriesRef.current,
                    });
                    setShowVolumeProfile(newShow);
                  }}
                  className={`flex items-center gap-2 w-full px-3 py-2 rounded text-sm transition-all duration-200 ${
                    showVolumeProfile
                      ? 'bg-purple-500/20 text-purple-300 shadow-sm shadow-purple-500/20'
                      : 'text-white/50 hover:bg-white/5 hover:text-white/70'
                  }`}
                >
                  <BarChart3 className="h-4 w-4 rotate-90" />
                  <span>Vol Profile</span>
                </button>

                {/* SMA Toggle with Period */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      const newShow = !showSMA;
                      setShowSMA(newShow);
                      if (smaSeriesRef.current) {
                        smaSeriesRef.current.applyOptions({ visible: newShow });
                      }
                    }}
                    className={`flex items-center gap-2 flex-1 px-3 py-2 rounded-l text-sm transition-all duration-200 ${
                      showSMA
                        ? 'bg-cyan-500/20 text-cyan-300 shadow-sm shadow-cyan-500/20'
                        : 'text-white/50 hover:bg-white/5 hover:text-white/70'
                    }`}
                  >
                    <Minus className="h-4 w-4" />
                    <span>SMA</span>
                  </button>
                  <select
                    value={smaPeriod}
                    onChange={(e) => {
                      const newPeriod = parseInt(e.target.value);
                      setSmaPeriod(newPeriod);
                      // Recalculate SMA with new period
                      if (smaSeriesRef.current && candleDataRef.current.length > 0) {
                        const closes = candleDataRef.current.map((c: any) => c.close);
                        const smaData = candleDataRef.current.map((candle: any, i: number) => {
                          if (i < newPeriod - 1) return null;
                          const sum = closes.slice(i - newPeriod + 1, i + 1).reduce((a: number, b: number) => a + b, 0);
                          return { time: candle.time, value: sum / newPeriod };
                        }).filter(Boolean);
                        smaSeriesRef.current.setData(smaData);
                      }
                    }}
                    className="w-14 px-1 py-2 rounded-r bg-black/60 border border-white/10 text-xs text-white/70 focus:outline-none focus:border-cyan-500/50"
                  >
                    <option value="9">9</option>
                    <option value="20">20</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                    <option value="200">200</option>
                  </select>
                </div>

                {/* EMA Toggle with Period */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      const newShow = !showEMA;
                      setShowEMA(newShow);
                      if (emaSeriesRef.current) {
                        emaSeriesRef.current.applyOptions({ visible: newShow });
                      }
                    }}
                    className={`flex items-center gap-2 flex-1 px-3 py-2 rounded-l text-sm transition-all duration-200 ${
                      showEMA
                        ? 'bg-purple-500/20 text-purple-300 shadow-sm shadow-purple-500/20'
                        : 'text-white/50 hover:bg-white/5 hover:text-white/70'
                    }`}
                  >
                    <Minus className="h-4 w-4" />
                    <span>EMA</span>
                  </button>
                  <select
                    value={emaPeriod}
                    onChange={(e) => {
                      const newPeriod = parseInt(e.target.value);
                      setEmaPeriod(newPeriod);
                      // Recalculate EMA with new period
                      if (emaSeriesRef.current && candleDataRef.current.length > 0) {
                        const multiplier = 2 / (newPeriod + 1);
                        let ema: number | null = null;
                        const emaData = candleDataRef.current.map((candle: any, i: number) => {
                          if (i < newPeriod - 1) return null;
                          if (ema === null) {
                            const sum = candleDataRef.current.slice(0, newPeriod).reduce((a: number, c: any) => a + c.close, 0);
                            ema = sum / newPeriod;
                          } else {
                            ema = (candle.close - ema) * multiplier + ema;
                          }
                          return { time: candle.time, value: ema };
                        }).filter(Boolean);
                        emaSeriesRef.current.setData(emaData);
                      }
                    }}
                    className="w-14 px-1 py-2 rounded-r bg-black/60 border border-white/10 text-xs text-white/70 focus:outline-none focus:border-purple-500/50"
                  >
                    <option value="9">9</option>
                    <option value="12">12</option>
                    <option value="20">20</option>
                    <option value="26">26</option>
                    <option value="50">50</option>
                  </select>
                </div>

                {/* RSI Toggle with Period */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      const newShow = !showRSI;
                      setShowRSI(newShow);
                      if (rsiSeriesRef.current && chartRef.current) {
                        rsiSeriesRef.current.applyOptions({ visible: newShow });
                        chartRef.current.priceScale('rsi').applyOptions({ visible: newShow });
                      }
                    }}
                    className={`flex items-center gap-2 flex-1 px-3 py-2 rounded-l text-sm transition-all duration-200 ${
                      showRSI
                        ? 'bg-pink-500/20 text-pink-300 shadow-sm shadow-pink-500/20'
                        : 'text-white/50 hover:bg-white/5 hover:text-white/70'
                    }`}
                  >
                    <Activity className="h-4 w-4" />
                    <span>RSI</span>
                  </button>
                  <select
                    value={rsiPeriod}
                    onChange={(e) => {
                      const newPeriod = parseInt(e.target.value);
                      setRsiPeriod(newPeriod);
                      // Recalculate RSI with new period
                      if (rsiSeriesRef.current && candleDataRef.current.length > 0) {
                        const gains: number[] = [];
                        const losses: number[] = [];
                        const rsiData: { time: any; value: number }[] = [];
                        for (let i = 1; i < candleDataRef.current.length; i++) {
                          const change = candleDataRef.current[i].close - candleDataRef.current[i - 1].close;
                          gains.push(change > 0 ? change : 0);
                          losses.push(change < 0 ? -change : 0);
                          if (i >= newPeriod) {
                            const avgGain = gains.slice(i - newPeriod, i).reduce((a, b) => a + b, 0) / newPeriod;
                            const avgLoss = losses.slice(i - newPeriod, i).reduce((a, b) => a + b, 0) / newPeriod;
                            const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
                            const rsi = 100 - (100 / (1 + rs));
                            rsiData.push({ time: candleDataRef.current[i].time, value: rsi });
                          }
                        }
                        rsiSeriesRef.current.setData(rsiData);
                      }
                    }}
                    className="w-14 px-1 py-2 rounded-r bg-black/60 border border-white/10 text-xs text-white/70 focus:outline-none focus:border-pink-500/50"
                  >
                    <option value="7">7</option>
                    <option value="14">14</option>
                    <option value="21">21</option>
                  </select>
                </div>

                {/* Bollinger Bands Toggle with Period */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      const newShow = !showBB;
                      setShowBB(newShow);
                      if (bbUpperSeriesRef.current && bbMiddleSeriesRef.current && bbLowerSeriesRef.current) {
                        bbUpperSeriesRef.current.applyOptions({ visible: newShow });
                        bbMiddleSeriesRef.current.applyOptions({ visible: newShow });
                        bbLowerSeriesRef.current.applyOptions({ visible: newShow });
                      }
                    }}
                    className={`flex items-center gap-2 flex-1 px-3 py-2 rounded-l text-sm transition-all duration-200 ${
                      showBB
                        ? 'bg-amber-500/20 text-amber-300 shadow-sm shadow-amber-500/20'
                        : 'text-white/50 hover:bg-white/5 hover:text-white/70'
                    }`}
                  >
                    <TrendingUp className="h-4 w-4" />
                    <span>BB</span>
                  </button>
                  <select
                    value={bbPeriod}
                    onChange={(e) => {
                      const newPeriod = parseInt(e.target.value);
                      setBbPeriod(newPeriod);
                      // Recalculate BB with new period
                      if (bbUpperSeriesRef.current && bbMiddleSeriesRef.current && bbLowerSeriesRef.current && candleDataRef.current.length > 0) {
                        const closes = candleDataRef.current.map((c: any) => c.close);
                        const bbUpperData: { time: any; value: number }[] = [];
                        const bbMiddleData: { time: any; value: number }[] = [];
                        const bbLowerData: { time: any; value: number }[] = [];
                        for (let i = newPeriod - 1; i < candleDataRef.current.length; i++) {
                          const slice = closes.slice(i - newPeriod + 1, i + 1);
                          const sma = slice.reduce((a: number, b: number) => a + b, 0) / newPeriod;
                          const squaredDiffs = slice.map((v: number) => Math.pow(v - sma, 2));
                          const variance = squaredDiffs.reduce((a: number, b: number) => a + b, 0) / newPeriod;
                          const stdDev = Math.sqrt(variance);
                          bbMiddleData.push({ time: candleDataRef.current[i].time, value: sma });
                          bbUpperData.push({ time: candleDataRef.current[i].time, value: sma + bbStdDev * stdDev });
                          bbLowerData.push({ time: candleDataRef.current[i].time, value: sma - bbStdDev * stdDev });
                        }
                        bbUpperSeriesRef.current.setData(bbUpperData);
                        bbMiddleSeriesRef.current.setData(bbMiddleData);
                        bbLowerSeriesRef.current.setData(bbLowerData);
                      }
                    }}
                    className="w-14 px-1 py-2 rounded-r bg-black/60 border border-white/10 text-xs text-white/70 focus:outline-none focus:border-amber-500/50"
                  >
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="50">50</option>
                  </select>
                </div>

                {/* MACD Toggle */}
                <button
                  onClick={() => {
                    const newShow = !showMACD;
                    setShowMACD(newShow);
                    if (macdLineSeriesRef.current && macdSignalSeriesRef.current && macdHistogramSeriesRef.current && chartRef.current) {
                      macdLineSeriesRef.current.applyOptions({ visible: newShow });
                      macdSignalSeriesRef.current.applyOptions({ visible: newShow });
                      macdHistogramSeriesRef.current.applyOptions({ visible: newShow });
                      chartRef.current.priceScale('macd').applyOptions({ visible: newShow });
                    }
                  }}
                  className={`flex items-center gap-2 w-full px-3 py-2 rounded text-sm transition-all duration-200 ${
                    showMACD
                      ? 'bg-blue-500/20 text-blue-300 shadow-sm shadow-blue-500/20'
                      : 'text-white/50 hover:bg-white/5 hover:text-white/70'
                  }`}
                >
                  <Activity className="h-4 w-4" />
                  <span>MACD</span>
                  <span className="ml-auto text-[10px] opacity-50">12/26/9</span>
                </button>
              </div>
            )}
          </div>

          {/* Drawing Tools Group */}
          <div className="border-b border-purple-500/20">
            <button
              onClick={() => toggleGroup('drawing')}
              className={`flex items-center gap-2 w-full p-3 transition-all duration-200 ${
                expandedGroup === 'drawing'
                  ? 'bg-purple-500/20 text-purple-300'
                  : 'text-white/60 hover:bg-white/5 hover:text-white/80'
              }`}
              title="Drawing Tools"
            >
              <Pencil className="h-5 w-5" />
              {expandedGroup === 'drawing' && (
                <span className="text-sm font-medium">Drawing</span>
              )}
              {expandedGroup === 'drawing' && (
                <ChevronRight className="h-4 w-4 ml-auto rotate-90" />
              )}
            </button>
            {expandedGroup === 'drawing' && (
              <div className="pb-2 px-2 space-y-1">
                <button
                  onClick={() => setDrawingMode('none')}
                  className={`flex items-center gap-2 w-full px-3 py-2 rounded text-sm transition-all duration-200 ${
                    drawingMode === 'none'
                      ? 'bg-white/20 text-white shadow-sm shadow-white/20'
                      : 'text-white/50 hover:bg-white/5 hover:text-white/70'
                  }`}
                  title="Select (ESC)"
                >
                  <MousePointer className="h-4 w-4" />
                  <span>Select</span>
                </button>
                <button
                  onClick={() => setDrawingMode(drawingMode === 'horizontal' ? 'none' : 'horizontal')}
                  className={`flex items-center gap-2 w-full px-3 py-2 rounded text-sm transition-all duration-200 ${
                    drawingMode === 'horizontal'
                      ? 'bg-yellow-400/20 text-yellow-300 shadow-sm shadow-yellow-400/30'
                      : 'text-white/50 hover:bg-yellow-400/10 hover:text-yellow-300'
                  }`}
                  title="Horizontal Line (H)"
                >
                  <Minus className="h-4 w-4" />
                  <span>H-Line</span>
                </button>
                <button
                  onClick={() => setDrawingMode(drawingMode === 'trendline' ? 'none' : 'trendline')}
                  className={`flex items-center gap-2 w-full px-3 py-2 rounded text-sm transition-all duration-200 ${
                    drawingMode === 'trendline'
                      ? 'bg-purple-500/20 text-purple-300 shadow-sm shadow-purple-500/30'
                      : 'text-white/50 hover:bg-purple-500/10 hover:text-purple-300'
                  }`}
                  title="Trend Line (T)"
                >
                  <TrendingUp className="h-4 w-4" />
                  <span>Trend</span>
                </button>
                <button
                  onClick={() => setDrawingMode(drawingMode === 'rectangle' ? 'none' : 'rectangle')}
                  className={`flex items-center gap-2 w-full px-3 py-2 rounded text-sm transition-all duration-200 ${
                    drawingMode === 'rectangle'
                      ? 'bg-cyan-400/20 text-cyan-300 shadow-sm shadow-cyan-400/30'
                      : 'text-white/50 hover:bg-cyan-400/10 hover:text-cyan-300'
                  }`}
                  title="Rectangle (R)"
                >
                  <Square className="h-4 w-4" />
                  <span>Rect</span>
                </button>
                <button
                  onClick={() => setDrawingMode(drawingMode === 'circle' ? 'none' : 'circle')}
                  className={`flex items-center gap-2 w-full px-3 py-2 rounded text-sm transition-all duration-200 ${
                    drawingMode === 'circle'
                      ? 'bg-pink-400/20 text-pink-300 shadow-sm shadow-pink-400/30'
                      : 'text-white/50 hover:bg-pink-400/10 hover:text-pink-300'
                  }`}
                  title="Circle (C)"
                >
                  <Circle className="h-4 w-4" />
                  <span>Circle</span>
                </button>
                <button
                  onClick={() => setDrawingMode(drawingMode === 'fibonacci' ? 'none' : 'fibonacci')}
                  className={`flex items-center gap-2 w-full px-3 py-2 rounded text-sm transition-all duration-200 ${
                    drawingMode === 'fibonacci'
                      ? 'bg-orange-400/20 text-orange-300 shadow-sm shadow-orange-400/30'
                      : 'text-white/50 hover:bg-orange-400/10 hover:text-orange-300'
                  }`}
                  title="Fibonacci (F)"
                >
                  <Percent className="h-4 w-4" />
                  <span>Fib</span>
                </button>
                <button
                  onClick={() => setDrawingMode(drawingMode === 'pitchfork' ? 'none' : 'pitchfork')}
                  className={`flex items-center gap-2 w-full px-3 py-2 rounded text-sm transition-all duration-200 ${
                    drawingMode === 'pitchfork'
                      ? 'bg-emerald-400/20 text-emerald-300 shadow-sm shadow-emerald-400/30'
                      : 'text-white/50 hover:bg-emerald-400/10 hover:text-emerald-300'
                  }`}
                  title="Pitchfork (P)"
                >
                  <GitFork className="h-4 w-4" />
                  <span>Pitchfork</span>
                </button>
                <button
                  onClick={() => setDrawingMode(drawingMode === 'arrow' ? 'none' : 'arrow')}
                  className={`flex items-center gap-2 w-full px-3 py-2 rounded text-sm transition-all duration-200 ${
                    drawingMode === 'arrow'
                      ? 'bg-red-400/20 text-red-300 shadow-sm shadow-red-400/30'
                      : 'text-white/50 hover:bg-red-400/10 hover:text-red-300'
                  }`}
                  title="Arrow (A)"
                >
                  <ArrowUpRight className="h-4 w-4" />
                  <span>Arrow</span>
                </button>
                <div className="my-1 border-t border-white/10" />
                <button
                  onClick={clearAllDrawings}
                  disabled={totalDrawings === 0}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded text-sm text-white/50 transition-all duration-200 hover:bg-red-500/20 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Clear All"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Clear</span>
                </button>
              </div>
            )}
          </div>

          {/* Settings Group */}
          <div>
            <button
              onClick={() => toggleGroup('settings')}
              className={`flex items-center gap-2 w-full p-3 transition-all duration-200 ${
                expandedGroup === 'settings'
                  ? 'bg-purple-500/20 text-purple-300'
                  : 'text-white/60 hover:bg-white/5 hover:text-white/80'
              }`}
              title="Settings"
            >
              <Settings className="h-5 w-5" />
              {expandedGroup === 'settings' && (
                <span className="text-sm font-medium">Settings</span>
              )}
              {expandedGroup === 'settings' && (
                <ChevronRight className="h-4 w-4 ml-auto rotate-90" />
              )}
            </button>
            {expandedGroup === 'settings' && (
              <div className="pb-2 px-2 space-y-3 max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-purple-500/30">
                {/* Color Swatch Picker Helper */}
                {(() => {
                  const colorSwatches = ['#4ade80', '#fb7185', '#22d3ee', '#a855f7', '#facc15', '#f472b6', '#ffffff', '#64748b'];
                  const ColorPicker = ({ value, onChange, label }: { value: string; onChange: (c: string) => void; label: string }) => (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-white/60 w-12">{label}</span>
                      <div className="flex gap-1">
                        {colorSwatches.map(color => (
                          <button
                            key={color}
                            onClick={() => onChange(color)}
                            className={`w-5 h-5 rounded border-2 transition-all ${value === color ? 'border-white scale-110' : 'border-transparent hover:border-white/40'}`}
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                        ))}
                      </div>
                    </div>
                  );
                  return (
                    <>
                      {/* Candlestick Colors */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs font-medium text-purple-300">
                          <Palette className="h-3 w-3" />
                          <span>Candles</span>
                        </div>
                        <div className="space-y-1.5 pl-5">
                          <ColorPicker label="Up" value={chartSettings.candleUpColor} onChange={(c) => setChartSettings(s => ({ ...s, candleUpColor: c }))} />
                          <ColorPicker label="Down" value={chartSettings.candleDownColor} onChange={(c) => setChartSettings(s => ({ ...s, candleDownColor: c }))} />
                        </div>
                      </div>

                      {/* Grid Settings */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs font-medium text-purple-300">
                          <Grid3X3 className="h-3 w-3" />
                          <span>Grid</span>
                        </div>
                        <div className="pl-5 space-y-1.5">
                          <button
                            onClick={() => setChartSettings(s => ({ ...s, showGrid: !s.showGrid }))}
                            className={`flex items-center gap-2 w-full px-2 py-1 rounded text-xs transition-all ${
                              chartSettings.showGrid
                                ? 'bg-cyan-500/20 text-cyan-300'
                                : 'text-white/50 hover:bg-white/5'
                            }`}
                          >
                            <div className={`w-3 h-3 rounded-sm border ${chartSettings.showGrid ? 'bg-cyan-400 border-cyan-400' : 'border-white/40'}`} />
                            <span>Show Grid</span>
                          </button>
                        </div>
                      </div>

                      {/* Crosshair Mode */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs font-medium text-purple-300">
                          <Crosshair className="h-3 w-3" />
                          <span>Crosshair</span>
                        </div>
                        <div className="pl-5 flex gap-1">
                          {(['normal', 'magnet', 'hidden'] as const).map(mode => (
                            <button
                              key={mode}
                              onClick={() => setChartSettings(s => ({ ...s, crosshairMode: mode }))}
                              className={`px-2 py-1 rounded text-xs capitalize transition-all ${
                                chartSettings.crosshairMode === mode
                                  ? 'bg-purple-500/30 text-purple-300'
                                  : 'text-white/50 hover:bg-white/5'
                              }`}
                            >
                              {mode}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Volume Colors */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs font-medium text-purple-300">
                          <Activity className="h-3 w-3" />
                          <span>Volume</span>
                        </div>
                        <div className="space-y-1.5 pl-5">
                          <ColorPicker label="Up" value={chartSettings.volumeUpColor} onChange={(c) => setChartSettings(s => ({ ...s, volumeUpColor: c }))} />
                          <ColorPicker label="Down" value={chartSettings.volumeDownColor} onChange={(c) => setChartSettings(s => ({ ...s, volumeDownColor: c }))} />
                        </div>
                      </div>

                      {/* Drawing Defaults */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs font-medium text-purple-300">
                          <Pencil className="h-3 w-3" />
                          <span>Drawing Default</span>
                        </div>
                        <div className="pl-5">
                          <ColorPicker label="Color" value={chartSettings.defaultDrawingColor} onChange={(c) => setChartSettings(s => ({ ...s, defaultDrawingColor: c }))} />
                        </div>
                      </div>

                      {/* Theme Presets */}
                      <div className="space-y-2 pt-2 border-t border-white/10">
                        <div className="flex items-center gap-2 text-xs font-medium text-purple-300">
                          <Save className="h-3 w-3" />
                          <span>Presets</span>
                        </div>
                        <div className="pl-5 flex gap-1">
                          <button
                            onClick={() => {
                              localStorage.setItem('chartSettingsPreset', JSON.stringify(chartSettings));
                              toast.success('Theme saved!');
                            }}
                            className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-all"
                          >
                            <Save className="h-3 w-3" />
                            Save
                          </button>
                          <button
                            onClick={() => {
                              const saved = localStorage.getItem('chartSettingsPreset');
                              if (saved) {
                                setChartSettings(JSON.parse(saved));
                                toast.success('Theme loaded!');
                              } else {
                                toast.error('No saved theme found');
                              }
                            }}
                            className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 transition-all"
                          >
                            <RotateCcw className="h-3 w-3" />
                            Load
                          </button>
                          <button
                            onClick={() => {
                              setChartSettings({
                                candleUpColor: '#4ade80',
                                candleDownColor: '#fb7185',
                                showGrid: true,
                                gridOpacity: 0.08,
                                crosshairMode: 'normal',
                                volumeUpColor: '#4ade80',
                                volumeDownColor: '#fb7185',
                                defaultDrawingColor: '#facc15',
                              });
                              toast.success('Reset to defaults');
                            }}
                            className="px-2 py-1 rounded text-xs text-white/50 hover:bg-white/5 transition-all"
                          >
                            Reset
                          </button>
                        </div>
                      </div>

                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </div>

        {/* Chart Area */}
        <div className="relative flex-1 flex flex-col">
          {/* Chart Controls Toolbar Bar */}
          <div className="relative z-[200] flex items-center justify-between px-3 py-2 border-b border-purple-500/20 bg-black/40 backdrop-blur-sm">
            {/* Left side - Symbol & Timeframe */}
            <div className="flex items-center gap-3">
              {/* Symbol Selector Dropdown */}
              <div className="relative" ref={tickerDropdownRef}>
                <button
                  onClick={() => setTickerDropdownOpen(!tickerDropdownOpen)}
                  className="flex items-center gap-2 px-2 py-1 rounded border border-purple-500/30 bg-black/60 hover:bg-purple-500/20 transition-all"
                >
                  <span className="text-sm font-semibold text-white/90">{currentSymbolInfo.shortName}</span>
                  <span className="text-xs text-white/50">{symbol}</span>
                  <ChevronDown className={`h-3.5 w-3.5 text-white/50 transition-transform ${tickerDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {tickerDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 w-64 rounded-lg border border-purple-500/30 bg-black/95 backdrop-blur-md shadow-lg shadow-purple-500/20 z-[150] overflow-hidden">
                    {/* Search Input */}
                    <div className="p-2 border-b border-white/10">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40" />
                        <input
                          type="text"
                          value={tickerSearch}
                          onChange={(e) => setTickerSearch(e.target.value)}
                          placeholder="Search symbols..."
                          className="w-full pl-7 pr-2 py-1.5 rounded bg-white/5 border border-white/10 text-sm text-white/90 placeholder-white/30 focus:outline-none focus:border-purple-500/50"
                          autoFocus
                        />
                      </div>
                    </div>

                    {/* Symbol List */}
                    <div className="max-h-48 overflow-y-auto">
                      {filteredSymbols.length > 0 ? (
                        filteredSymbols.map((s) => (
                          <button
                            key={s.symbol}
                            onClick={() => handleSymbolSelect(s.symbol)}
                            className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-all ${
                              s.symbol === symbol
                                ? 'bg-purple-500/30 text-purple-200'
                                : 'text-white/70 hover:bg-white/5 hover:text-white/90'
                            }`}
                          >
                            <span className="font-semibold text-sm w-8">{s.shortName}</span>
                            <span className="text-xs text-white/50">{s.symbol}</span>
                            <span className="text-xs text-white/40 ml-auto">{s.name}</span>
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-4 text-center text-xs text-white/40">
                          No symbols found
                        </div>
                      )}
                    </div>

                    {/* Custom Symbol Input */}
                    {tickerSearch && !filteredSymbols.some(s => s.symbol.toLowerCase() === tickerSearch.toLowerCase()) && (
                      <div className="p-2 border-t border-white/10">
                        <button
                          onClick={() => handleSymbolSelect(tickerSearch.toUpperCase())}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded bg-cyan-500/20 text-cyan-300 text-sm hover:bg-cyan-500/30 transition-all"
                        >
                          <span>Use custom symbol:</span>
                          <span className="font-semibold">{tickerSearch.toUpperCase()}</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Timeframe Selector Dropdown */}
              <div className="relative" ref={timeframeDropdownRef}>
                <button
                  onClick={() => setTimeframeDropdownOpen(!timeframeDropdownOpen)}
                  className="flex items-center gap-2 px-2 py-1 rounded border border-purple-500/30 bg-black/60 hover:bg-purple-500/20 transition-all"
                >
                  <Clock className="h-3.5 w-3.5 text-purple-400" />
                  <span className="text-sm font-semibold text-white/90">{timeframe}</span>
                  <ChevronDown className={`h-3.5 w-3.5 text-white/50 transition-transform ${timeframeDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {timeframeDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 w-32 rounded-lg border border-purple-500/30 bg-black/95 backdrop-blur-md shadow-lg shadow-purple-500/20 z-[150] overflow-hidden">
                    {(['1m', '5m', '15m', '1h', '4h', '1D'] as Timeframe[]).map((tf) => (
                      <button
                        key={tf}
                        onClick={(e) => {
                          e.stopPropagation();
                          setTimeframe(tf);
                          setTimeframeDropdownOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-all ${
                          tf === timeframe
                            ? 'bg-purple-500/30 text-purple-200'
                            : 'text-white/70 hover:bg-white/5 hover:text-white/90'
                        }`}
                      >
                        <span className="font-medium text-sm">{tf}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right side - Controls */}
            <div className="flex items-center gap-2">
              {/* Zoom Controls */}
              <div className="flex items-center rounded border border-cyan-500/30 bg-black/60 overflow-hidden">
                <button
                  onClick={() => {
                    if (chartRef.current) {
                      const timeScale = chartRef.current.timeScale();
                      const logicalRange = timeScale.getVisibleLogicalRange();
                      if (logicalRange) {
                        const rangeSize = logicalRange.to - logicalRange.from;
                        const center = (logicalRange.from + logicalRange.to) / 2;
                        const newSize = rangeSize * 0.7;
                        timeScale.setVisibleLogicalRange({
                          from: center - newSize / 2,
                          to: center + newSize / 2,
                        });
                      }
                    }
                  }}
                  className="p-1.5 text-white/50 hover:text-cyan-300 hover:bg-cyan-500/20 transition-all"
                  title="Zoom In"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>
                <div className="w-px h-4 bg-cyan-500/20" />
                <button
                  onClick={() => {
                    if (chartRef.current) {
                      const timeScale = chartRef.current.timeScale();
                      const logicalRange = timeScale.getVisibleLogicalRange();
                      if (logicalRange) {
                        const rangeSize = logicalRange.to - logicalRange.from;
                        const center = (logicalRange.from + logicalRange.to) / 2;
                        const newSize = rangeSize * 1.4;
                        timeScale.setVisibleLogicalRange({
                          from: center - newSize / 2,
                          to: center + newSize / 2,
                        });
                      }
                    }
                  }}
                  className="p-1.5 text-white/50 hover:text-cyan-300 hover:bg-cyan-500/20 transition-all"
                  title="Zoom Out"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </button>
                <div className="w-px h-4 bg-cyan-500/20" />
                <button
                  onClick={() => {
                    if (chartRef.current) {
                      chartRef.current.timeScale().fitContent();
                    }
                  }}
                  className="p-1.5 text-white/50 hover:text-cyan-300 hover:bg-cyan-500/20 transition-all"
                  title="Fit all data"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Auto-scale Toggle */}
              <button
                onClick={() => {
                  const newAutoScale = !autoScale;
                  setAutoScale(newAutoScale);
                  if (chartRef.current) {
                    chartRef.current.priceScale('right').applyOptions({
                      autoScale: newAutoScale,
                    });
                  }
                  toast.success(newAutoScale ? 'Auto-scale enabled' : 'Auto-scale disabled');
                }}
                className={`flex items-center gap-1 px-2 py-1 rounded border transition-all text-xs font-medium ${
                  autoScale
                    ? 'border-emerald-500/30 bg-emerald-500/20 text-emerald-300'
                    : 'border-white/20 bg-black/60 text-white/50 hover:text-white/80'
                }`}
                title={autoScale ? 'Auto-scale ON' : 'Auto-scale OFF'}
              >
                Auto
              </button>

              {/* Screenshot Button */}
              <button
                onClick={() => {
                  if (chartRef.current && chartContainerRef.current) {
                    const canvas = chartContainerRef.current.querySelector('canvas');
                    if (canvas) {
                      const link = document.createElement('a');
                      link.download = `${symbol}-${timeframe}-${new Date().toISOString().slice(0, 10)}.png`;
                      link.href = canvas.toDataURL('image/png');
                      link.click();
                      toast.success('Screenshot saved!');
                    }
                  }
                }}
                className="p-1.5 rounded border border-amber-500/30 bg-black/60 text-white/50 hover:text-amber-300 hover:bg-amber-500/20 transition-all"
                title="Save screenshot"
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Chart Container */}
          <div className="w-full relative overflow-hidden">
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

          {/* Crosshair Info Bar - Neon Cyberpunk Style */}
      {crosshairInfo && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 rounded-lg border border-cyan-500/30 bg-black/90 px-3 py-1.5 backdrop-blur-md shadow-lg shadow-cyan-500/10">
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
           drawingMode === 'circle' ? (activeDrawing ? 'Release to complete' : 'Click and drag to draw') :
           drawingMode === 'fibonacci' ? (activeDrawing ? 'Release to complete' : 'Click and drag for Fib levels') :
           drawingMode === 'pitchfork' ? (!pendingPitchfork ? 'Click anchor point' : !pendingPitchfork.p2 ? 'Click second point' : 'Click third point') :
           drawingMode === 'arrow' ? (activeDrawing ? 'Release to complete' : 'Click and drag to draw arrow') : ''}
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

      {/* Volume Profile Overlay */}
      {showVolumeProfile && volumeProfile.length > 0 && candlestickSeriesRef.current && (
        <div
          key={`vp-${volumeProfileRenderKey}`}
          className="absolute right-[70px] top-0 bottom-[85px] w-24 pointer-events-none z-[45] overflow-hidden"
        >
          <div className="relative h-full w-full">
            {/* Show all levels visible in current price range */}
            {volumeProfile.map((level) => {
              const y = candlestickSeriesRef.current?.priceToCoordinate(level.price);
              if (y === null || y === undefined || y < 0 || y > 800) return null;

              return (
                <div
                  key={level.price}
                  className="absolute right-0 h-[3px]"
                  style={{
                    top: `${y}px`,
                    width: `${level.pct}%`,
                    background: level.pct > 70
                      ? 'linear-gradient(to right, rgba(168, 85, 247, 0.6), rgba(168, 85, 247, 0.9))'
                      : level.pct > 40
                      ? 'linear-gradient(to right, rgba(34, 211, 238, 0.4), rgba(34, 211, 238, 0.7))'
                      : 'linear-gradient(to right, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.4))',
                    boxShadow: level.pct > 70
                      ? '0 0 6px rgba(168, 85, 247, 0.5)'
                      : level.pct > 40
                      ? '0 0 4px rgba(34, 211, 238, 0.3)'
                      : 'none',
                  }}
                  title={`$${level.price.toFixed(2)} - ${level.volume.toFixed(0)} vol (${level.pct.toFixed(1)}%)`}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Live Preview while drawing */}
      {activeDrawing && previewCoord && chartContainerRef.current && (
        <svg
          className="absolute inset-0 z-[55] pointer-events-none"
          style={{
            width: chartContainerRef.current.clientWidth,
            height: 800,
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
          {/* Fibonacci Preview */}
          {activeDrawing.type === 'fibonacci' && (() => {
            const startY = activeDrawing.startCoord.y;
            const endY = previewCoord.y;
            const leftX = Math.min(activeDrawing.startCoord.x, previewCoord.x);
            const rightX = Math.max(activeDrawing.startCoord.x, previewCoord.x);
            const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
            const priceDiff = endY - startY;

            return (
              <>
                {/* Shaded area */}
                <rect
                  x={leftX}
                  y={Math.min(startY, endY)}
                  width={rightX - leftX}
                  height={Math.abs(endY - startY)}
                  fill="rgba(251, 146, 60, 0.08)"
                  stroke="none"
                />
                {/* Level lines */}
                {levels.map((level, idx) => {
                  const levelY = startY + priceDiff * level;
                  const levelPercent = (level * 100).toFixed(1);
                  return (
                    <g key={idx}>
                      <line
                        x1={leftX}
                        y1={levelY}
                        x2={rightX}
                        y2={levelY}
                        stroke="#fb923c"
                        strokeWidth={level === 0 || level === 1 ? 2 : 1}
                        strokeDasharray={level === 0.5 ? "8,4" : level === 0 || level === 1 ? "none" : "4,2"}
                        opacity={level === 0 || level === 1 ? 1 : 0.7}
                        className="marching-ants"
                      />
                      <text x={rightX + 6} y={levelY + 4} fill="#fb923c" fontSize={10} opacity={0.9}>
                        {levelPercent}%
                      </text>
                    </g>
                  );
                })}
                {/* Start/End handles */}
                <circle cx={activeDrawing.startCoord.x} cy={startY} r={8} fill="#fb923c" />
                <circle cx={activeDrawing.startCoord.x} cy={startY} r={3} fill="#fff" />
                <circle cx={previewCoord.x} cy={endY} r={8} fill="#fb923c" />
                <circle cx={previewCoord.x} cy={endY} r={3} fill="#fff" />
              </>
            );
          })()}
          {/* Arrow Preview */}
          {activeDrawing.type === 'arrow' && (
            <>
              <defs>
                <marker
                  id="arrowhead-preview"
                  markerWidth="10"
                  markerHeight="7"
                  refX="9"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3.5, 0 7" fill="#ef4444" />
                </marker>
              </defs>
              <line
                x1={activeDrawing.startCoord.x}
                y1={activeDrawing.startCoord.y}
                x2={previewCoord.x}
                y2={previewCoord.y}
                stroke="#ef4444"
                strokeWidth={3}
                strokeDasharray="8,4"
                strokeLinecap="round"
                markerEnd="url(#arrowhead-preview)"
                className="marching-ants"
              />
              <circle cx={activeDrawing.startCoord.x} cy={activeDrawing.startCoord.y} r={8} fill="#ef4444" />
              <circle cx={activeDrawing.startCoord.x} cy={activeDrawing.startCoord.y} r={3} fill="#fff" />
              <circle cx={previewCoord.x} cy={previewCoord.y} r={6} fill="#ef4444" />
            </>
          )}
        </svg>
      )}

      {/* Pitchfork Preview - separate since it's multi-click */}
      {drawingMode === 'pitchfork' && pendingPitchfork && chartContainerRef.current && (
        <svg
          className="absolute inset-0 z-[55] pointer-events-none"
          style={{
            width: chartContainerRef.current.clientWidth,
            height: 800,
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
          {(() => {
            if (!chartRef.current || !candlestickSeriesRef.current) return null;

            const x1 = chartRef.current.timeScale().timeToCoordinate(pendingPitchfork.p1.time as any);
            const y1 = candlestickSeriesRef.current.priceToCoordinate(pendingPitchfork.p1.price);
            if (x1 === null || y1 === null) return null;

            const x2 = pendingPitchfork.p2 ? chartRef.current.timeScale().timeToCoordinate(pendingPitchfork.p2.time as any) : previewCoord?.x;
            const y2 = pendingPitchfork.p2 ? candlestickSeriesRef.current.priceToCoordinate(pendingPitchfork.p2.price) : previewCoord?.y;
            const x3 = previewCoord?.x;
            const y3 = previewCoord?.y;

            return (
              <>
                {/* Anchor point (p1) */}
                <circle cx={x1} cy={y1} r={8} fill="#10b981" />
                <circle cx={x1} cy={y1} r={3} fill="#fff" />

                {/* Second point (p2) - either placed or preview */}
                {(x2 !== null && x2 !== undefined && y2 !== null && y2 !== undefined) && (
                  <>
                    <circle cx={x2} cy={y2} r={6} fill="#10b981" opacity={pendingPitchfork.p2 ? 1 : 0.6} />
                    {pendingPitchfork.p2 && <circle cx={x2} cy={y2} r={2} fill="#fff" />}

                    {/* Line from p1 to p2 */}
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke="#10b981"
                      strokeWidth={2}
                      strokeDasharray={pendingPitchfork.p2 ? "none" : "8,4"}
                      className={!pendingPitchfork.p2 ? "marching-ants" : ""}
                    />
                  </>
                )}

                {/* Third point (p3) preview - only if p2 is already placed */}
                {pendingPitchfork.p2 && x2 !== null && y2 !== null && x3 !== undefined && y3 !== undefined && (
                  <>
                    <circle cx={x3} cy={y3} r={6} fill="#10b981" opacity={0.6} />

                    {/* Line from p1 to p3 */}
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x3}
                      y2={y3}
                      stroke="#10b981"
                      strokeWidth={2}
                      strokeDasharray="8,4"
                      className="marching-ants"
                    />

                    {/* Base line from p2 to p3 */}
                    <line
                      x1={x2}
                      y1={y2}
                      x2={x3}
                      y2={y3}
                      stroke="#10b981"
                      strokeWidth={1}
                      strokeDasharray="4,2"
                      opacity={0.6}
                    />

                    {/* Preview median line */}
                    {(() => {
                      if (x2 === undefined || y2 === undefined) return null;
                      const midX = (x2 + x3) / 2;
                      const midY = (y2 + y3) / 2;
                      const dx = midX - x1;
                      const dy = midY - y1;
                      const extMidX = x1 + dx * 2;
                      const extMidY = y1 + dy * 2;
                      return (
                        <line
                          x1={x1}
                          y1={y1}
                          x2={extMidX}
                          y2={extMidY}
                          stroke="#10b981"
                          strokeWidth={2}
                          strokeDasharray="8,4"
                          opacity={0.5}
                          className="marching-ants"
                        />
                      );
                    })()}
                  </>
                )}
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

        // Get border style based on line style
        const getBorderStyle = (style: LineStyle) => {
          switch (style) {
            case 'dotted': return 'dotted';
            case 'dashed': return 'dashed';
            default: return 'solid';
          }
        };

        return (
          <div
            key={line.id}
            className={`absolute left-0 right-[70px] z-[60] transition-all pointer-events-auto cursor-grab ${isDragging ? 'opacity-70 cursor-grabbing' : ''}`}
            style={{
              top: `${yCoord - 4}px`,
              height: '9px',
              paddingTop: `${4 - Math.floor(line.width / 2)}px`,
            }}
            onContextMenu={(e) => openDrawingContextMenu(e, 'hline', line.id)}
            onMouseDown={(e) => {
              if (e.button === 0) { // Left click only
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
              }
            }}
          >
            {/* Visual line with neon glow */}
            <div
              className="w-full pointer-events-none"
              style={{
                borderTopWidth: `${line.width}px`,
                borderTopStyle: getBorderStyle(line.style),
                borderColor: line.color,
                boxShadow: `0 0 8px ${line.color}, 0 0 16px ${line.color}60`,
              }}
            />
            {/* Text Label */}
            {line.text?.content && (
              <div
                className="absolute pointer-events-none whitespace-nowrap"
                style={{
                  top: '4px',
                  left: line.text.position === 'left' ? '8px' : line.text.position === 'center' ? '50%' : 'auto',
                  right: line.text.position === 'right' ? '80px' : 'auto',
                  transform: line.text.position === 'center' ? 'translateX(-50%)' : 'none',
                  fontSize: `${line.text.size}px`,
                  fontWeight: line.text.bold ? 'bold' : 'normal',
                  fontStyle: line.text.italic ? 'italic' : 'normal',
                  textDecoration: line.text.underline ? 'underline' : 'none',
                  color: line.color,
                  textShadow: `0 0 6px ${line.color}, 0 1px 2px rgba(0,0,0,0.8)`,
                }}
              >
                {line.text.content}
              </div>
            )}
          </div>
        );
      })}

      {/* Trend Lines (SVG overlay) */}
      {trendLines.length > 0 && chartContainerRef.current && (
        <svg
          className="absolute inset-0 z-[60] pointer-events-none"
          style={{
            width: chartContainerRef.current.clientWidth,
            height: 800,
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

            // Get SVG stroke dasharray based on line style
            const getStrokeDasharray = (style: LineStyle) => {
              switch (style) {
                case 'dotted': return '4,4';
                case 'dashed': return '10,6';
                default: return 'none';
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
                  onContextMenu={(e: React.MouseEvent) => openDrawingContextMenu(e, 'trendline', line.id)}
                />
                {/* Visual line with neon glow */}
                <line
                  x1={startX}
                  y1={startY}
                  x2={endX}
                  y2={endY}
                  stroke={line.color}
                  strokeWidth={line.width}
                  strokeLinecap="round"
                  strokeDasharray={getStrokeDasharray(line.style)}
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
                {/* Text Label */}
                {line.text?.content && (() => {
                  const midX = (startX + endX) / 2;
                  const midY = (startY + endY) / 2;
                  const textX = line.text.position === 'left' ? startX + 10 : line.text.position === 'right' ? endX - 10 : midX;
                  const textY = line.text.position === 'left' ? startY - 10 : line.text.position === 'right' ? endY - 10 : midY - 10;
                  return (
                    <text
                      x={textX}
                      y={textY}
                      fill={line.color}
                      fontSize={line.text.size}
                      fontWeight={line.text.bold ? 'bold' : 'normal'}
                      fontStyle={line.text.italic ? 'italic' : 'normal'}
                      textDecoration={line.text.underline ? 'underline' : 'none'}
                      textAnchor={line.text.position === 'left' ? 'start' : line.text.position === 'right' ? 'end' : 'middle'}
                      style={{ pointerEvents: 'none', filter: `drop-shadow(0 0 4px ${line.color})` }}
                    >
                      {line.text.content}
                    </text>
                  );
                })()}
              </g>
            );
          })}
        </svg>
      )}

      {/* Rectangles (SVG overlay) */}
      {rectangles.length > 0 && chartContainerRef.current && (
        <svg
          className="absolute inset-0 z-[60] pointer-events-none"
          style={{
            width: chartContainerRef.current.clientWidth,
            height: 800,
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
                {/* Invisible fill rect for dragging/right-click anywhere inside */}
                <rect
                  x={left}
                  y={top}
                  width={width}
                  height={height}
                  fill="rgba(0,0,0,0.001)"
                  stroke="rgba(0,0,0,0.001)"
                  strokeWidth={12}
                  style={{ pointerEvents: 'auto', cursor: 'move' }}
                  onMouseDown={handleRectDragStart}
                  onContextMenu={(e: React.MouseEvent) => openDrawingContextMenu(e, 'rectangle', rect.id)}
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
                {/* Text Label */}
                {rect.text?.content && (() => {
                  const textX = rect.text.position === 'left' ? left + 8 : rect.text.position === 'right' ? left + width - 8 : left + width / 2;
                  const textY = top + 16;
                  return (
                    <text
                      x={textX}
                      y={textY}
                      fill={rect.color}
                      fontSize={rect.text.size}
                      fontWeight={rect.text.bold ? 'bold' : 'normal'}
                      fontStyle={rect.text.italic ? 'italic' : 'normal'}
                      textDecoration={rect.text.underline ? 'underline' : 'none'}
                      textAnchor={rect.text.position === 'left' ? 'start' : rect.text.position === 'right' ? 'end' : 'middle'}
                      style={{ pointerEvents: 'none', filter: `drop-shadow(0 0 4px ${rect.color})` }}
                    >
                      {rect.text.content}
                    </text>
                  );
                })()}
              </g>
            );
          })}
        </svg>
      )}

      {/* Circles/Ellipses (SVG overlay) */}
      {circles.length > 0 && chartContainerRef.current && (
        <svg
          className="absolute inset-0 z-[60] pointer-events-none"
          style={{
            width: chartContainerRef.current.clientWidth,
            height: 800,
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
                {/* Invisible ellipse fill for right-click/drag anywhere inside */}
                <ellipse
                  cx={cx}
                  cy={cy}
                  rx={circle.radiusX}
                  ry={circle.radiusY}
                  fill="rgba(0,0,0,0.001)"
                  stroke="rgba(0,0,0,0.001)"
                  strokeWidth={12}
                  style={{ pointerEvents: 'auto', cursor: 'move' }}
                  onMouseDown={handleCenterDragStart}
                  onContextMenu={(e: React.MouseEvent) => openDrawingContextMenu(e, 'circle', circle.id)}
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
                {/* Text Label */}
                {circle.text?.content && (() => {
                  const textX = circle.text.position === 'left' ? cx - circle.radiusX + 10 : circle.text.position === 'right' ? cx + circle.radiusX - 10 : cx;
                  const textY = cy - circle.radiusY + 16;
                  return (
                    <text
                      x={textX}
                      y={textY}
                      fill={circle.color}
                      fontSize={circle.text.size}
                      fontWeight={circle.text.bold ? 'bold' : 'normal'}
                      fontStyle={circle.text.italic ? 'italic' : 'normal'}
                      textDecoration={circle.text.underline ? 'underline' : 'none'}
                      textAnchor={circle.text.position === 'left' ? 'start' : circle.text.position === 'right' ? 'end' : 'middle'}
                      style={{ pointerEvents: 'none', filter: `drop-shadow(0 0 4px ${circle.color})` }}
                    >
                      {circle.text.content}
                    </text>
                  );
                })()}
              </g>
            );
          })}
        </svg>
      )}

      {/* Fibonacci Retracements (SVG overlay) */}
      {fibonacciRetracements.length > 0 && chartContainerRef.current && (
        <svg
          className="absolute inset-0 z-[60] pointer-events-none"
          style={{
            width: chartContainerRef.current.clientWidth,
            height: 800,
          }}
        >
          <defs>
            <filter id="fibGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {fibonacciRetracements.map(fib => {
            if (!chartRef.current || !candlestickSeriesRef.current) return null;

            const x1 = chartRef.current.timeScale().timeToCoordinate(fib.start.time as any);
            const y1 = candlestickSeriesRef.current.priceToCoordinate(fib.start.price);
            const x2 = chartRef.current.timeScale().timeToCoordinate(fib.end.time as any);
            const y2 = candlestickSeriesRef.current.priceToCoordinate(fib.end.price);

            if (x1 === null || y1 === null || x2 === null || y2 === null) return null;

            const priceDiff = fib.end.price - fib.start.price;
            const leftX = Math.min(x1, x2);
            const rightX = Math.max(x1, x2);
            const isSelected = selectedDrawing?.type === 'fibonacci' && selectedDrawing?.id === fib.id;

            const isDragging = draggingFibonacci?.id === fib.id;

            const handleStartDragStart = (e: React.MouseEvent) => {
              e.preventDefault();
              e.stopPropagation();
              setDraggingFibonacci({ id: fib.id, point: 'start' });
              setSelectedDrawing({ type: 'fibonacci', id: fib.id });
              if (chartRef.current) {
                chartRef.current.applyOptions({ handleScroll: false, handleScale: false });
              }
            };

            const handleEndDragStart = (e: React.MouseEvent) => {
              e.preventDefault();
              e.stopPropagation();
              setDraggingFibonacci({ id: fib.id, point: 'end' });
              setSelectedDrawing({ type: 'fibonacci', id: fib.id });
              if (chartRef.current) {
                chartRef.current.applyOptions({ handleScroll: false, handleScale: false });
              }
            };

            return (
              <g key={fib.id}>
                {fib.levels.map((level, idx) => {
                  const levelPrice = fib.start.price + priceDiff * level;
                  const levelY = candlestickSeriesRef.current?.priceToCoordinate(levelPrice);
                  if (levelY === null || levelY === undefined) return null;

                  const levelPercent = (level * 100).toFixed(1);
                  const opacity = level === 0 || level === 1 ? 1 : 0.7;

                  return (
                    <g key={`${fib.id}-level-${idx}`}>
                      {/* Invisible wider line for interaction */}
                      <line
                        x1={leftX}
                        y1={levelY}
                        x2={rightX}
                        y2={levelY}
                        stroke="transparent"
                        strokeWidth={12}
                        style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                        onContextMenu={(e: React.MouseEvent) => openDrawingContextMenu(e, 'fibonacci', fib.id)}
                        onClick={() => setSelectedDrawing({ type: 'fibonacci', id: fib.id })}
                      />
                      {/* Visible level line */}
                      <line
                        x1={leftX}
                        y1={levelY}
                        x2={rightX}
                        y2={levelY}
                        stroke={fib.color}
                        strokeWidth={level === 0 || level === 1 ? 2 : (isSelected ? 2 : 1.5)}
                        strokeDasharray={level === 0.5 ? "8,4" : level === 0 || level === 1 ? "none" : "4,2"}
                        opacity={1}
                        style={{ pointerEvents: 'none', filter: `drop-shadow(0 0 3px ${fib.color})` }}
                      />
                      {/* Level label */}
                      <text
                        x={rightX + 6}
                        y={levelY + 4}
                        fill={fib.color}
                        fontSize={10}
                        opacity={0.9}
                        style={{ pointerEvents: 'none', filter: `drop-shadow(0 0 2px ${fib.color})` }}
                      >
                        {levelPercent}%
                      </text>
                    </g>
                  );
                })}
                {/* Shaded area between 0% and 100% */}
                <rect
                  x={leftX}
                  y={Math.min(y1, y2)}
                  width={rightX - leftX}
                  height={Math.abs(y2 - y1)}
                  fill={fib.color}
                  opacity={0.05}
                  style={{ pointerEvents: 'none' }}
                />
                {/* Drag handles - only show when selected */}
                {isSelected && (
                  <>
                    {/* Start drag handle (0% level) */}
                    <circle
                      cx={x1}
                      cy={y1}
                      r={7}
                      fill={fib.color}
                      stroke={isDragging && draggingFibonacci?.point === 'start' ? '#fff' : 'transparent'}
                      strokeWidth={2}
                      style={{ pointerEvents: 'auto', cursor: 'grab', filter: `drop-shadow(0 0 3px ${fib.color})` }}
                      onMouseDown={handleStartDragStart}
                    />
                    <circle cx={x1} cy={y1} r={2} fill="#fff" style={{ pointerEvents: 'none' }} />
                    {/* End drag handle (100% level) */}
                    <circle
                      cx={x2}
                      cy={y2}
                      r={7}
                      fill={fib.color}
                      stroke={isDragging && draggingFibonacci?.point === 'end' ? '#fff' : 'transparent'}
                      strokeWidth={2}
                      style={{ pointerEvents: 'auto', cursor: 'grab', filter: `drop-shadow(0 0 3px ${fib.color})` }}
                      onMouseDown={handleEndDragStart}
                    />
                    <circle cx={x2} cy={y2} r={2} fill="#fff" style={{ pointerEvents: 'none' }} />
                  </>
                )}
                {/* Text Label */}
                {fib.text?.content && (() => {
                  const textX = fib.text.position === 'left' ? leftX + 8 : fib.text.position === 'right' ? rightX - 8 : (leftX + rightX) / 2;
                  const textY = Math.min(y1, y2) + 16;
                  return (
                    <text
                      x={textX}
                      y={textY}
                      fill={fib.color}
                      fontSize={fib.text.size}
                      fontWeight={fib.text.bold ? 'bold' : 'normal'}
                      fontStyle={fib.text.italic ? 'italic' : 'normal'}
                      textDecoration={fib.text.underline ? 'underline' : 'none'}
                      textAnchor={fib.text.position === 'left' ? 'start' : fib.text.position === 'right' ? 'end' : 'middle'}
                      style={{ pointerEvents: 'none', filter: `drop-shadow(0 0 4px ${fib.color})` }}
                    >
                      {fib.text.content}
                    </text>
                  );
                })()}
              </g>
            );
          })}
        </svg>
      )}

      {/* Pitchforks (SVG overlay) */}
      {pitchforks.length > 0 && chartContainerRef.current && (
        <svg
          className="absolute inset-0 z-[60] pointer-events-none"
          style={{
            width: chartContainerRef.current.clientWidth,
            height: 800,
          }}
        >
          <defs>
            <filter id="pitchforkGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {pitchforks.map(pf => {
            if (!chartRef.current || !candlestickSeriesRef.current) return null;

            const x1 = chartRef.current.timeScale().timeToCoordinate(pf.p1.time as any);
            const y1 = candlestickSeriesRef.current.priceToCoordinate(pf.p1.price);
            const x2 = chartRef.current.timeScale().timeToCoordinate(pf.p2.time as any);
            const y2 = candlestickSeriesRef.current.priceToCoordinate(pf.p2.price);
            const x3 = chartRef.current.timeScale().timeToCoordinate(pf.p3.time as any);
            const y3 = candlestickSeriesRef.current.priceToCoordinate(pf.p3.price);

            if (x1 === null || y1 === null || x2 === null || y2 === null || x3 === null || y3 === null) return null;

            // Calculate midpoint between p2 and p3
            const midX = (x2 + x3) / 2;
            const midY = (y2 + y3) / 2;

            // Extend the median line (from p1 through midpoint)
            const dx = midX - x1;
            const dy = midY - y1;
            const extendFactor = 3; // Extend 3x the original length
            const extMidX = x1 + dx * extendFactor;
            const extMidY = y1 + dy * extendFactor;

            // Parallel lines through p2 and p3
            const ext2X = x2 + dx * (extendFactor - 1);
            const ext2Y = y2 + dy * (extendFactor - 1);
            const ext3X = x3 + dx * (extendFactor - 1);
            const ext3Y = y3 + dy * (extendFactor - 1);

            const isSelected = selectedDrawing?.type === 'pitchfork' && selectedDrawing?.id === pf.id;
            const isDragging = draggingPitchfork?.id === pf.id;

            const handleP1DragStart = (e: React.MouseEvent) => {
              e.preventDefault();
              e.stopPropagation();
              setDraggingPitchfork({ id: pf.id, point: 'p1' });
              setSelectedDrawing({ type: 'pitchfork', id: pf.id });
              if (chartRef.current) {
                chartRef.current.applyOptions({ handleScroll: false, handleScale: false });
              }
            };

            const handleP2DragStart = (e: React.MouseEvent) => {
              e.preventDefault();
              e.stopPropagation();
              setDraggingPitchfork({ id: pf.id, point: 'p2' });
              setSelectedDrawing({ type: 'pitchfork', id: pf.id });
              if (chartRef.current) {
                chartRef.current.applyOptions({ handleScroll: false, handleScale: false });
              }
            };

            const handleP3DragStart = (e: React.MouseEvent) => {
              e.preventDefault();
              e.stopPropagation();
              setDraggingPitchfork({ id: pf.id, point: 'p3' });
              setSelectedDrawing({ type: 'pitchfork', id: pf.id });
              if (chartRef.current) {
                chartRef.current.applyOptions({ handleScroll: false, handleScale: false });
              }
            };

            return (
              <g key={pf.id}>
                {/* Invisible area for interaction */}
                <line
                  x1={x1}
                  y1={y1}
                  x2={extMidX}
                  y2={extMidY}
                  stroke="transparent"
                  strokeWidth={12}
                  style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                  onContextMenu={(e: React.MouseEvent) => openDrawingContextMenu(e, 'pitchfork', pf.id)}
                  onClick={() => setSelectedDrawing({ type: 'pitchfork', id: pf.id })}
                />
                {/* Median line (from p1 through midpoint) */}
                <line
                  x1={x1}
                  y1={y1}
                  x2={extMidX}
                  y2={extMidY}
                  stroke={pf.color}
                  strokeWidth={isSelected ? 3 : 2}
                  filter="url(#pitchforkGlow)"
                  style={{ pointerEvents: 'none' }}
                />
                {/* Upper parallel (through p2) */}
                <line
                  x1={x2}
                  y1={y2}
                  x2={ext2X}
                  y2={ext2Y}
                  stroke={pf.color}
                  strokeWidth={isSelected ? 2 : 1}
                  strokeDasharray="6,3"
                  opacity={0.8}
                  filter="url(#pitchforkGlow)"
                  style={{ pointerEvents: 'none' }}
                />
                {/* Lower parallel (through p3) */}
                <line
                  x1={x3}
                  y1={y3}
                  x2={ext3X}
                  y2={ext3Y}
                  stroke={pf.color}
                  strokeWidth={isSelected ? 2 : 1}
                  strokeDasharray="6,3"
                  opacity={0.8}
                  filter="url(#pitchforkGlow)"
                  style={{ pointerEvents: 'none' }}
                />
                {/* Base line connecting p2 and p3 */}
                <line
                  x1={x2}
                  y1={y2}
                  x2={x3}
                  y2={y3}
                  stroke={pf.color}
                  strokeWidth={1}
                  strokeDasharray="4,2"
                  opacity={0.6}
                  style={{ pointerEvents: 'none' }}
                />
                {/* Drag handles - only show when selected */}
                {isSelected && (
                  <>
                    {/* Anchor point (p1) - draggable */}
                    <circle
                      cx={x1}
                      cy={y1}
                      r={7}
                      fill={pf.color}
                      stroke={isDragging && draggingPitchfork?.point === 'p1' ? '#fff' : 'transparent'}
                      strokeWidth={2}
                      style={{ pointerEvents: 'auto', cursor: 'grab', filter: `drop-shadow(0 0 3px ${pf.color})` }}
                      onMouseDown={handleP1DragStart}
                    />
                    <circle cx={x1} cy={y1} r={2} fill="#fff" style={{ pointerEvents: 'none' }} />
                    {/* Point p2 - draggable */}
                    <circle
                      cx={x2}
                      cy={y2}
                      r={6}
                      fill={pf.color}
                      stroke={isDragging && draggingPitchfork?.point === 'p2' ? '#fff' : 'transparent'}
                      strokeWidth={2}
                      style={{ pointerEvents: 'auto', cursor: 'grab', filter: `drop-shadow(0 0 3px ${pf.color})` }}
                      onMouseDown={handleP2DragStart}
                    />
                    <circle cx={x2} cy={y2} r={2} fill="#fff" style={{ pointerEvents: 'none' }} />
                    {/* Point p3 - draggable */}
                    <circle
                      cx={x3}
                      cy={y3}
                      r={6}
                      fill={pf.color}
                      stroke={isDragging && draggingPitchfork?.point === 'p3' ? '#fff' : 'transparent'}
                      strokeWidth={2}
                      style={{ pointerEvents: 'auto', cursor: 'grab', filter: `drop-shadow(0 0 3px ${pf.color})` }}
                      onMouseDown={handleP3DragStart}
                    />
                    <circle cx={x3} cy={y3} r={2} fill="#fff" style={{ pointerEvents: 'none' }} />
                  </>
                )}
                {/* Text Label */}
                {pf.text?.content && (
                  <text
                    x={x1 + 10}
                    y={y1 - 10}
                    fill={pf.color}
                    fontSize={pf.text.size}
                    fontWeight={pf.text.bold ? 'bold' : 'normal'}
                    fontStyle={pf.text.italic ? 'italic' : 'normal'}
                    textDecoration={pf.text.underline ? 'underline' : 'none'}
                    textAnchor="start"
                    style={{ pointerEvents: 'none', filter: `drop-shadow(0 0 4px ${pf.color})` }}
                  >
                    {pf.text.content}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      )}

      {/* Arrows (SVG overlay) */}
      {arrows.length > 0 && chartContainerRef.current && (
        <svg
          className="absolute inset-0 z-[60] pointer-events-none"
          style={{
            width: chartContainerRef.current.clientWidth,
            height: 800,
          }}
        >
          <defs>
            <filter id="arrowGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {arrows.map(arrow => (
              <marker
                key={`arrowhead-${arrow.id}`}
                id={`arrowhead-${arrow.id}`}
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3.5, 0 7"
                  fill={arrow.color}
                />
              </marker>
            ))}
          </defs>
          {arrows.map(arrow => {
            if (!chartRef.current || !candlestickSeriesRef.current) return null;

            const x1 = chartRef.current.timeScale().timeToCoordinate(arrow.start.time as any);
            const y1 = candlestickSeriesRef.current.priceToCoordinate(arrow.start.price);
            const x2 = chartRef.current.timeScale().timeToCoordinate(arrow.end.time as any);
            const y2 = candlestickSeriesRef.current.priceToCoordinate(arrow.end.price);

            if (x1 === null || y1 === null || x2 === null || y2 === null) return null;

            const isSelected = selectedDrawing?.type === 'arrow' && selectedDrawing?.id === arrow.id;
            const isDragging = draggingArrow?.id === arrow.id;

            const handleStartDragStart = (e: React.MouseEvent) => {
              e.preventDefault();
              e.stopPropagation();
              setDraggingArrow({ id: arrow.id, point: 'start' });
              setSelectedDrawing({ type: 'arrow', id: arrow.id });
              if (chartRef.current) {
                chartRef.current.applyOptions({ handleScroll: false, handleScale: false });
              }
            };

            const handleEndDragStart = (e: React.MouseEvent) => {
              e.preventDefault();
              e.stopPropagation();
              setDraggingArrow({ id: arrow.id, point: 'end' });
              setSelectedDrawing({ type: 'arrow', id: arrow.id });
              if (chartRef.current) {
                chartRef.current.applyOptions({ handleScroll: false, handleScale: false });
              }
            };

            return (
              <g key={arrow.id}>
                {/* Invisible wider line for interaction */}
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="transparent"
                  strokeWidth={12}
                  style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                  onContextMenu={(e: React.MouseEvent) => openDrawingContextMenu(e, 'arrow', arrow.id)}
                  onClick={() => setSelectedDrawing({ type: 'arrow', id: arrow.id })}
                />
                {/* Visible arrow line */}
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={arrow.color}
                  strokeWidth={isSelected ? 3 : 2}
                  filter="url(#arrowGlow)"
                  markerEnd={`url(#arrowhead-${arrow.id})`}
                  style={{ pointerEvents: 'none' }}
                />
                {/* Drag handles - only show when selected */}
                {isSelected && (
                  <>
                    {/* Start point - draggable */}
                    <circle
                      cx={x1}
                      cy={y1}
                      r={7}
                      fill={arrow.color}
                      stroke={isDragging && draggingArrow?.point === 'start' ? '#fff' : 'transparent'}
                      strokeWidth={2}
                      style={{ pointerEvents: 'auto', cursor: 'grab', filter: `drop-shadow(0 0 3px ${arrow.color})` }}
                      onMouseDown={handleStartDragStart}
                    />
                    <circle cx={x1} cy={y1} r={2} fill="#fff" style={{ pointerEvents: 'none' }} />
                    {/* End point - draggable (near the arrowhead) */}
                    <circle
                      cx={x2}
                      cy={y2}
                      r={7}
                      fill={arrow.color}
                      stroke={isDragging && draggingArrow?.point === 'end' ? '#fff' : 'transparent'}
                      strokeWidth={2}
                      style={{ pointerEvents: 'auto', cursor: 'grab', filter: `drop-shadow(0 0 3px ${arrow.color})` }}
                      onMouseDown={handleEndDragStart}
                    />
                    <circle cx={x2} cy={y2} r={2} fill="#fff" style={{ pointerEvents: 'none' }} />
                  </>
                )}
                {/* Text Label from text property */}
                {arrow.text?.content && (() => {
                  const midX = (x1 + x2) / 2;
                  const textX = arrow.text.position === 'left' ? Math.min(x1, x2) + 10 : arrow.text.position === 'right' ? Math.max(x1, x2) - 10 : midX;
                  const textY = (y1 + y2) / 2 - 12;
                  return (
                    <text
                      x={textX}
                      y={textY}
                      fill={arrow.color}
                      fontSize={arrow.text.size}
                      fontWeight={arrow.text.bold ? 'bold' : 'normal'}
                      fontStyle={arrow.text.italic ? 'italic' : 'normal'}
                      textDecoration={arrow.text.underline ? 'underline' : 'none'}
                      textAnchor={arrow.text.position === 'left' ? 'start' : arrow.text.position === 'right' ? 'end' : 'middle'}
                      style={{ pointerEvents: 'none', filter: `drop-shadow(0 0 4px ${arrow.color})` }}
                    >
                      {arrow.text.content}
                    </text>
                  );
                })()}
              </g>
            );
          })}
        </svg>
      )}

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
            <div className="mt-4 flex items-center justify-between px-4 pb-4">
              <div className="text-sm text-white/50">Current Price</div>
              <div className="font-mono text-2xl font-bold text-cyan-400">
                ${Number(priceData.price).toFixed(2)}
              </div>
            </div>
          )}
          </div>
          {/* End Chart Container */}
        </div>
        {/* End Chart Area */}
      </div>
      {/* End Flex Container */}

      {/* Drawing Context Menu */}
      {drawingContextMenu && (() => {
        const { type, id } = drawingContextMenu;
        const isLine = type === 'hline' || type === 'trendline';

        // Get current settings of the drawing
        const getCurrentSettings = () => {
          if (type === 'hline') {
            const line = horizontalLines.find(l => l.id === id);
            return { color: line?.color || '#facc15', style: line?.style || 'solid', width: line?.width || 2, text: line?.text || defaultText };
          } else if (type === 'trendline') {
            const line = trendLines.find(l => l.id === id);
            return { color: line?.color || '#facc15', style: line?.style || 'solid', width: line?.width || 2, text: line?.text || defaultText };
          } else if (type === 'rectangle') {
            const rect = rectangles.find(r => r.id === id);
            return { color: rect?.color || '#facc15', text: rect?.text || defaultText };
          } else if (type === 'circle') {
            const circ = circles.find(c => c.id === id);
            return { color: circ?.color || '#facc15', text: circ?.text || defaultText };
          } else if (type === 'fibonacci') {
            const fib = fibonacciRetracements.find(f => f.id === id);
            return { color: fib?.color || '#facc15', text: fib?.text || defaultText };
          } else if (type === 'pitchfork') {
            const pf = pitchforks.find(p => p.id === id);
            return { color: pf?.color || '#facc15', text: pf?.text || defaultText };
          } else if (type === 'arrow') {
            const arr = arrows.find(a => a.id === id);
            return { color: arr?.color || '#facc15', text: arr?.text || defaultText };
          }
          return { color: '#facc15', text: defaultText };
        };

        const currentSettings = getCurrentSettings();

        // Update text properties without closing menu
        const updateText = (updates: Partial<DrawingText>) => {
          const newText = { ...currentSettings.text, ...updates };
          if (type === 'hline') {
            setHorizontalLines(lines => lines.map(l => l.id === id ? { ...l, text: newText } : l));
          } else if (type === 'trendline') {
            setTrendLines(lines => lines.map(l => l.id === id ? { ...l, text: newText } : l));
          } else if (type === 'rectangle') {
            setRectangles(rects => rects.map(r => r.id === id ? { ...r, text: newText } : r));
          } else if (type === 'circle') {
            setCircles(circs => circs.map(c => c.id === id ? { ...c, text: newText } : c));
          } else if (type === 'fibonacci') {
            setFibonacciRetracements(fibs => fibs.map(f => f.id === id ? { ...f, text: newText } : f));
          } else if (type === 'pitchfork') {
            setPitchforks(pfs => pfs.map(p => p.id === id ? { ...p, text: newText } : p));
          } else if (type === 'arrow') {
            setArrows(arrs => arrs.map(a => a.id === id ? { ...a, text: newText } : a));
          }
        };

        // Apply color and close menu (for swatch clicks)
        const applyColor = (color: string) => {
          updateColor(color);
          setDrawingContextMenu(null);
        };

        // Update color without closing menu (for color picker)
        const updateColor = (color: string) => {
          if (type === 'hline') {
            setHorizontalLines(lines => lines.map(l => l.id === id ? { ...l, color } : l));
          } else if (type === 'trendline') {
            setTrendLines(lines => lines.map(l => l.id === id ? { ...l, color } : l));
          } else if (type === 'rectangle') {
            setRectangles(rects => rects.map(r => r.id === id ? { ...r, color } : r));
          } else if (type === 'circle') {
            setCircles(circs => circs.map(c => c.id === id ? { ...c, color } : c));
          } else if (type === 'fibonacci') {
            setFibonacciRetracements(fibs => fibs.map(f => f.id === id ? { ...f, color } : f));
          } else if (type === 'pitchfork') {
            setPitchforks(pfs => pfs.map(p => p.id === id ? { ...p, color } : p));
          } else if (type === 'arrow') {
            setArrows(arrs => arrs.map(a => a.id === id ? { ...a, color } : a));
          }
        };

        const applyStyle = (style: LineStyle) => {
          if (type === 'hline') {
            setHorizontalLines(lines => lines.map(l => l.id === id ? { ...l, style } : l));
          } else if (type === 'trendline') {
            setTrendLines(lines => lines.map(l => l.id === id ? { ...l, style } : l));
          }
          setDrawingContextMenu(null);
        };

        const applyWidth = (width: LineWidth) => {
          if (type === 'hline') {
            setHorizontalLines(lines => lines.map(l => l.id === id ? { ...l, width } : l));
          } else if (type === 'trendline') {
            setTrendLines(lines => lines.map(l => l.id === id ? { ...l, width } : l));
          }
          setDrawingContextMenu(null);
        };

        // Apply a full preset (color + style + width for lines + text)
        const applyPreset = (preset: DrawingPreset) => {
          const textUpdate = preset.text ? { text: preset.text } : {};
          if (type === 'hline') {
            setHorizontalLines(lines => lines.map(l => l.id === id ? {
              ...l,
              color: preset.color,
              style: preset.style || l.style,
              width: preset.width || l.width,
              ...textUpdate
            } : l));
          } else if (type === 'trendline') {
            setTrendLines(lines => lines.map(l => l.id === id ? {
              ...l,
              color: preset.color,
              style: preset.style || l.style,
              width: preset.width || l.width,
              ...textUpdate
            } : l));
          } else if (type === 'rectangle') {
            setRectangles(rects => rects.map(r => r.id === id ? { ...r, color: preset.color, ...textUpdate } : r));
          } else if (type === 'circle') {
            setCircles(circs => circs.map(c => c.id === id ? { ...c, color: preset.color, ...textUpdate } : c));
          } else if (type === 'fibonacci') {
            setFibonacciRetracements(fibs => fibs.map(f => f.id === id ? { ...f, color: preset.color } : f));
          } else if (type === 'pitchfork') {
            setPitchforks(pfs => pfs.map(p => p.id === id ? { ...p, color: preset.color } : p));
          } else if (type === 'arrow') {
            setArrows(arrs => arrs.map(a => a.id === id ? { ...a, color: preset.color } : a));
          }
          setDrawingContextMenu(null);
        };

        const deleteDrawing = () => {
          if (type === 'hline') {
            setHorizontalLines(lines => lines.filter(l => l.id !== id));
          } else if (type === 'trendline') {
            setTrendLines(lines => lines.filter(l => l.id !== id));
          } else if (type === 'rectangle') {
            setRectangles(rects => rects.filter(r => r.id !== id));
          } else if (type === 'circle') {
            setCircles(circs => circs.filter(c => c.id !== id));
          } else if (type === 'fibonacci') {
            setFibonacciRetracements(fibs => fibs.filter(f => f.id !== id));
          } else if (type === 'pitchfork') {
            setPitchforks(pfs => pfs.filter(p => p.id !== id));
          } else if (type === 'arrow') {
            setArrows(arrs => arrs.filter(a => a.id !== id));
          }
          setDrawingContextMenu(null);
        };

        // Helper to get style indicator
        const getStyleIndicator = (style?: LineStyle) => {
          if (style === 'dashed') return '┄';
          if (style === 'dotted') return '┈';
          return '─';
        };

        return (
          <div
            className="absolute z-[200] bg-black/95 border border-purple-500/50 rounded-lg shadow-lg shadow-purple-500/20 min-w-[200px] backdrop-blur-sm"
            style={{
              left: `${drawingContextMenu.x}px`,
              top: `${drawingContextMenu.y}px`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Draggable Header */}
            <div
              className="flex items-center justify-between px-3 py-2 border-b border-white/10 cursor-move select-none"
              onMouseDown={(e) => {
                e.preventDefault();
                setContextMenuDragging({
                  startX: e.clientX,
                  startY: e.clientY,
                  menuX: drawingContextMenu.x,
                  menuY: drawingContextMenu.y,
                });
              }}
            >
              <span className="text-xs text-white/60 capitalize">{type} Settings</span>
              <div className="flex gap-0.5">
                <div className="w-1 h-1 rounded-full bg-white/30" />
                <div className="w-1 h-1 rounded-full bg-white/30" />
                <div className="w-1 h-1 rounded-full bg-white/30" />
              </div>
            </div>
            {/* Saved Presets for this drawing type */}
            {savedPresets[type]?.length > 0 && (
              <>
                <div className="px-3 py-1.5 text-xs text-white/40">Quick Apply</div>
                <div className="px-2 pb-2 flex flex-col gap-1 max-h-40 overflow-y-auto">
                  {savedPresets[type].map((preset) => (
                    <div key={preset.name} className="flex items-center gap-1 group">
                      <button
                        onClick={() => applyPreset(preset)}
                        className="flex items-center gap-2 px-2 py-1.5 rounded text-xs bg-white/5 hover:bg-white/10 transition-colors text-left flex-1"
                        title={`${preset.name}${isLine ? ` (${preset.style}, ${preset.width}px)` : ''}${preset.text?.content ? ` - "${preset.text.content}"` : ''}`}
                      >
                        <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: preset.color }} />
                        <span className="text-white/70 flex-1">{preset.name}</span>
                        {preset.text?.content && (
                          <span className="text-white/40 text-[10px]">T</span>
                        )}
                        {isLine && preset.style && preset.width && (
                          <span className="text-white/40 text-[10px] font-mono">
                            {getStyleIndicator(preset.style)} {preset.width}px
                          </span>
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSavedPresets(presets => ({
                            ...presets,
                            [type]: presets[type].filter(p => p.name !== preset.name)
                          }));
                          toast.success(`Deleted "${preset.name}"`);
                        }}
                        className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/20 transition-all"
                        title="Delete preset"
                      >
                        <X className="h-3 w-3 text-red-400" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="border-t border-white/10" />
              </>
            )}

            {/* Color Swatches */}
            <div className="px-3 py-1.5 text-xs text-white/40">Color</div>
            <div className="flex items-center gap-1 px-3 pb-2">
              {['#4ade80', '#fb7185', '#22d3ee', '#a855f7', '#facc15', '#f472b6', '#ffffff', '#64748b'].map(color => (
                <button
                  key={color}
                  onClick={() => applyColor(color)}
                  className={`w-5 h-5 rounded border hover:scale-110 transition-transform ${
                    currentSettings.color === color ? 'border-white ring-1 ring-white/50' : 'border-white/20'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
              {/* Custom Color Picker */}
              <div className="relative ml-1">
                <input
                  type="color"
                  value={currentSettings.color}
                  onChange={(e) => updateColor(e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  title="Pick custom color"
                />
                <div
                  className="w-5 h-5 rounded border border-dashed border-white/40 flex items-center justify-center hover:border-white/60 transition-colors"
                  style={{ background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)' }}
                >
                  <span className="text-[8px] text-white font-bold drop-shadow-lg">+</span>
                </div>
              </div>
            </div>

            {/* Line Style (only for lines) */}
            {isLine && (
              <>
                <div className="border-t border-white/10" />
                <div className="px-3 py-1.5 text-xs text-white/40">Style</div>
                <div className="flex gap-1 px-3 pb-2">
                  {(['solid', 'dashed', 'dotted'] as LineStyle[]).map(style => (
                    <button
                      key={style}
                      onClick={() => applyStyle(style)}
                      className={`px-2 py-1 rounded text-xs capitalize transition-colors ${
                        currentSettings.style === style
                          ? 'bg-purple-500/30 text-purple-300'
                          : 'bg-white/5 hover:bg-white/15 text-white/70'
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Line Width (only for lines) */}
            {isLine && (
              <>
                <div className="border-t border-white/10" />
                <div className="px-3 py-1.5 text-xs text-white/40">Width</div>
                <div className="flex gap-1 px-3 pb-2">
                  {([1, 2, 3, 4] as LineWidth[]).map(width => (
                    <button
                      key={width}
                      onClick={() => applyWidth(width)}
                      className={`w-8 h-6 rounded flex items-center justify-center transition-colors ${
                        currentSettings.width === width
                          ? 'bg-purple-500/30'
                          : 'bg-white/5 hover:bg-white/15'
                      }`}
                      title={`${width}px`}
                    >
                      <div
                        className="w-5 bg-white/70 rounded-full"
                        style={{ height: `${width}px` }}
                      />
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Text Label */}
            <div className="border-t border-white/10" />
            <div className="px-3 py-1.5 text-xs text-white/40">Text Label</div>
            <div className="px-3 pb-2 space-y-2">
              {/* Text Input */}
              <input
                type="text"
                value={currentSettings.text.content}
                onChange={(e) => updateText({ content: e.target.value })}
                placeholder="Enter label text..."
                className="w-full px-2 py-1 rounded text-xs bg-white/5 border border-white/10 text-white/80 placeholder-white/30 focus:outline-none focus:border-purple-500/50"
                onClick={(e) => e.stopPropagation()}
              />
              {/* Text Formatting */}
              <div className="flex items-center gap-1">
                {/* Bold */}
                <button
                  onClick={() => updateText({ bold: !currentSettings.text.bold })}
                  className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold transition-colors ${
                    currentSettings.text.bold ? 'bg-purple-500/30 text-purple-300' : 'bg-white/5 text-white/60 hover:bg-white/10'
                  }`}
                  title="Bold"
                >
                  B
                </button>
                {/* Italic */}
                <button
                  onClick={() => updateText({ italic: !currentSettings.text.italic })}
                  className={`w-6 h-6 rounded flex items-center justify-center text-xs italic transition-colors ${
                    currentSettings.text.italic ? 'bg-purple-500/30 text-purple-300' : 'bg-white/5 text-white/60 hover:bg-white/10'
                  }`}
                  title="Italic"
                >
                  I
                </button>
                {/* Underline */}
                <button
                  onClick={() => updateText({ underline: !currentSettings.text.underline })}
                  className={`w-6 h-6 rounded flex items-center justify-center text-xs underline transition-colors ${
                    currentSettings.text.underline ? 'bg-purple-500/30 text-purple-300' : 'bg-white/5 text-white/60 hover:bg-white/10'
                  }`}
                  title="Underline"
                >
                  U
                </button>
                <div className="w-px h-4 bg-white/10 mx-1" />
                {/* Font Size */}
                <select
                  value={currentSettings.text.size}
                  onChange={(e) => updateText({ size: parseInt(e.target.value) })}
                  className="px-1 py-0.5 rounded text-xs bg-white/5 border border-white/10 text-white/70 focus:outline-none"
                  onClick={(e) => e.stopPropagation()}
                >
                  {[10, 11, 12, 14, 16, 18, 20, 24].map(size => (
                    <option key={size} value={size} className="bg-slate-800">{size}px</option>
                  ))}
                </select>
                <div className="w-px h-4 bg-white/10 mx-1" />
                {/* Position */}
                <div className="flex gap-0.5">
                  {(['left', 'center', 'right'] as TextPosition[]).map(pos => (
                    <button
                      key={pos}
                      onClick={() => updateText({ position: pos })}
                      className={`w-6 h-6 rounded flex items-center justify-center text-[10px] transition-colors ${
                        currentSettings.text.position === pos ? 'bg-purple-500/30 text-purple-300' : 'bg-white/5 text-white/60 hover:bg-white/10'
                      }`}
                      title={`Align ${pos}`}
                    >
                      {pos === 'left' ? '⊏' : pos === 'center' ? '⊡' : '⊐'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Save Preset */}
            <div className="border-t border-white/10" />
            <div className="px-3 py-1.5 text-xs text-white/40">Save as Preset</div>
            <div className="px-3 pb-2">
              <div className="flex flex-col gap-1 mb-2 text-[10px] text-white/50">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: currentSettings.color }} />
                  <span>{currentSettings.color}</span>
                  {isLine && (
                    <>
                      <span>•</span>
                      <span>{currentSettings.style}</span>
                      <span>•</span>
                      <span>{currentSettings.width}px</span>
                    </>
                  )}
                </div>
                {currentSettings.text.content && (
                  <div className="flex items-center gap-1 text-white/40 truncate">
                    <span>T:</span>
                    <span className="truncate">"{currentSettings.text.content}"</span>
                  </div>
                )}
              </div>
              <div className="flex gap-1">
                <input
                  type="text"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  placeholder="Preset name..."
                  className="flex-1 px-2 py-1 rounded text-xs bg-white/5 border border-white/10 text-white/80 placeholder-white/30 focus:outline-none focus:border-purple-500/50"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newPresetName.trim()) {
                      e.preventDefault();
                      const newPreset: DrawingPreset = {
                        name: newPresetName.trim(),
                        color: currentSettings.color,
                        ...(isLine ? { style: currentSettings.style as LineStyle, width: currentSettings.width as LineWidth } : {}),
                        ...(currentSettings.text.content ? { text: currentSettings.text } : {})
                      };
                      setSavedPresets(presets => ({
                        ...presets,
                        [type]: [...(presets[type] || []).filter(p => p.name !== newPresetName.trim()), newPreset]
                      }));
                      setNewPresetName('');
                      toast.success(`Saved preset "${newPresetName.trim()}"`);
                    }
                  }}
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (newPresetName.trim()) {
                      const newPreset: DrawingPreset = {
                        name: newPresetName.trim(),
                        color: currentSettings.color,
                        ...(isLine ? { style: currentSettings.style as LineStyle, width: currentSettings.width as LineWidth } : {}),
                        ...(currentSettings.text.content ? { text: currentSettings.text } : {})
                      };
                      setSavedPresets(presets => ({
                        ...presets,
                        [type]: [...(presets[type] || []).filter(p => p.name !== newPresetName.trim()), newPreset]
                      }));
                      setNewPresetName('');
                      toast.success(`Saved preset "${newPresetName.trim()}"`);
                    }
                  }}
                  disabled={!newPresetName.trim()}
                  className="px-2 py-1 rounded text-xs bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  Save
                </button>
              </div>
            </div>

            {/* Delete */}
            <div className="border-t border-white/10">
              <button
                onClick={deleteDrawing}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-400 hover:bg-red-500/20 transition-colors"
              >
                <Trash2 className="h-3 w-3" />
                Delete
              </button>
            </div>
          </div>
        );
      })()}

      {/* Click outside to close context menu */}
      {drawingContextMenu && (
        <div
          className="absolute inset-0 z-[199]"
          onClick={() => setDrawingContextMenu(null)}
        />
      )}
    </div>
  );
}
