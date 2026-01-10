# Project Reminders & TODOs

This file tracks reminders, todos, and notes for future sessions.

---

## Next Session Priority

### 1. Volume Indicators
- [x] Volume bars below price chart (with toggle in sidebar)
- [x] Volume profile (sidebar showing volume at price levels)
- [x] VWAP (Volume Weighted Average Price) line
- [x] Anchored VWAP (click-to-place anchor point, calculates from that bar forward)
  - [x] Standard deviation bands (same as regular VWAP)
  - [x] Presets (save/load)
  - [x] Draggable anchor point (click target icon to reposition)

### 2. Technical Indicators
- [x] Moving averages (SMA, EMA) with configurable periods
- [x] RSI (Relative Strength Index) - separate pane using v5 panes API
- [x] MACD - separate pane using v5 panes API
- [x] Bollinger Bands

### 3. Chart Settings Panel
Allow traders to customize:
- [x] Candlestick colors (up/down)
- [x] Grid line visibility and colors
- [x] Crosshair style
- [x] Indicator parameters (period selectors for SMA, EMA, RSI, BB)
- [x] Drawing tool default colors
- [x] Theme presets (save/load)
- [x] Right-click context menu on drawings (change color/delete)
- [x] Saved/named colors (HighOfDay, LowOfDay, Support, Resistance, custom)
- [x] Line styles (solid, dashed, dotted) for h-lines and trend lines
- [x] Line widths (1-4px) for h-lines and trend lines
- [x] Volume colors (up/down) now actually apply

### 4. Additional Drawing Tools
- [x] Fibonacci retracement
- [x] Pitchfork
- [x] Text annotations (text labels on all drawing types with formatting)
- [x] Arrows/labels

### 5. Chart Controls
- [x] Timeframe selector (1m, 5m, 15m, 1h, 4h, 1D)
- [x] Zoom controls
- [x] Auto-scale toggle
- [x] Screenshot/export functionality

### 6. Tweaks & Refinements
- [x] Tweak VWAP settings (TradingView-style with anchor period, source, std dev bands)
- [x] Tweak Volume Profile settings (row count configurable)

### 8. Active Indicators Container
- [x] New container on left toolbar for active chart indicators
- [x] Display names and settings for all indicators on the current active chart
- [x] Users can change settings for each indicator
- [x] Close (x) button to remove indicators from the chart

### 7. Community Sharable Drawings
Allow traders to share drawings with the community:
- [ ] Right-click on any drawing → "Share with Community" option
- [ ] Dropdown in left toolbar showing community-shared drawings
- [ ] Plot shared drawings on your own chart
- [ ] Upvote/downvote shared drawings
- [ ] Sort community drawings by upvotes
- [ ] Support all drawing types (h-lines, fib, pitchfork, arrows, etc.)

---

## Known Bugs

- [x] **RSI subchart pane not removed on indicator close** - Fixed by moving chart cleanup outside state setter and using setTimeout to ensure series removal completes before pane removal.

---

## General Notes

### Standard Indicator Settings Pattern
All main-chart indicators (SMA, EMA, BB, VWAP, etc.) should include these settings in their Instance interface and UI:
1. **Color** - Preset color swatches (8 colors) + custom color picker
2. **Line Style** - Solid (0), Dotted (1), Dashed (2) selector buttons with `text-white` for contrast
3. **Line Width** - 1-4px selector buttons with `text-white` for contrast
4. For indicators with bands (VWAP, BB), include separate band color pickers

Instance interface should include:
```typescript
lineWidth: number; // 1-4
lineStyle: number; // 0=solid, 1=dotted, 2=dashed
```

Update function should apply changes with `as any` cast for lightweight-charts compatibility:
```typescript
instance.series.applyOptions({
  color: updates.color ?? instance.color,
  lineWidth: updates.lineWidth ?? instance.lineWidth,
  lineStyle: updates.lineStyle ?? instance.lineStyle,
} as any);
```

---

## Completed Items

- [x] Drawing tools (horizontal lines, trend lines, rectangles, circles)
- [x] Delete hotkey for drawings
- [x] Live preview with marching ants animation
- [x] Neon cyberpunk aesthetic for chart and tools
- [x] Lightweight Charts v5 upgrade
- [x] Volume bars below chart
- [x] Left sidebar with expandable tool groups (Indicators, Drawing, Settings)
- [x] Dynamic subchart panes using lightweight-charts v5 addPane() API
- [x] Fibonacci retracement drawing tool
- [x] Pitchfork drawing tool
- [x] Arrow drawing tool
- [x] Active Indicators Container (settings for each active indicator with close button)
- [x] Multiple VWAP instances (add daily, weekly, monthly VWAPs simultaneously)
- [x] Multiple instances for ALL indicators (SMA, EMA, RSI, BB, MACD, Volume Profile)
- [x] Anchored VWAP with std dev bands, presets, and draggable anchor point

---

*Last updated: 2026-01-10 (Added Anchored VWAP with std dev bands, presets, and draggable anchor point)*
