# VWAP Implementation Reference (TradingView)

This document contains the reference implementation for VWAP (Volume Weighted Average Price) and Anchored VWAP based on TradingView's Pine Script implementation.

## Sources

- [ryanpoh/Ryan-TradingView-Pinescript - vwap.pine](https://github.com/ryanpoh/Ryan-TradingView-Pinescript/blob/main/vwap.pine)
- [Pine Script Anchored VWAP Guide](https://offline-pixel.github.io/pinescript-strategies/pine-script-AnchoredVWAP.html)
- [TradingView VWAP Documentation](https://www.tradingview.com/support/solutions/43000502018-volume-weighted-average-price-vwap/)
- [ta.vwap Function - Pine Wizards](https://pinewizards.com/technical-analysis-functions/ta-vwap-function-in-pine-script/)

---

## Key Formulas

| Formula | Calculation |
|---------|-------------|
| **VWAP** | `Σ(Price × Volume) / Σ(Volume)` |
| **Typical Price** | `(High + Low + Close) / 3` (hlc3) |
| **Variance** | `Σ(Volume × Price²) / Σ(Volume) - VWAP²` |
| **Std Dev** | `√Variance` |
| **Upper Band** | `VWAP + (StdDev × Multiplier)` |
| **Lower Band** | `VWAP - (StdDev × Multiplier)` |

---

## VWAP Settings Structure

### Input Parameters

```
VWAP Settings Group:
├── Anchor Period: "Session" | "Week" | "Month" | "Quarter" | "Year" | "Decade" | "Century" | "Earnings" | "Dividends" | "Splits"
├── Source: hlc3 (default), hl2, close, open, high, low, ohlc4
├── Offset: 0 (default)
└── Hide VWAP on 1D or Above: false (default)

Standard Deviation Bands Settings Group:
├── Band #1: enabled=true, multiplier=1.0
├── Band #2: enabled=false, multiplier=2.0
└── Band #3: enabled=false, multiplier=3.0
```

### Anchor Period Detection

```javascript
switch (anchor) {
  "Session"  → new day detected
  "Week"     → new week detected
  "Month"    → new month detected
  "Quarter"  → new quarter detected (every 3 months)
  "Year"     → new year detected
  "Decade"   → year % 10 == 0 && first bar of year
  "Century"  → year % 100 == 0 && first bar of year
  "Earnings" → earnings data available (stocks only)
  "Dividends"→ dividends data available (stocks only)
  "Splits"   → splits data available (stocks only)
}
```

---

## TradingView VWAP Source Code (Pine Script v5)

```pinescript
//@version=5
indicator(title="Volume Weighted Average Price", shorttitle="VWAP", overlay=true, timeframe="", timeframe_gaps=true)

var cumVol = 0.
cumVol += nz(volume)
if barstate.islast and cumVol == 0
    runtime.error("No volume is provided by the data vendor.")

computeVWAP(src, isNewPeriod, stDevMultiplier) =>
    var float sumSrcVol = na
    var float sumVol = na
    var float sumSrcSrcVol = na

    sumSrcVol := isNewPeriod ? src * volume : src * volume + sumSrcVol[1]
    sumVol := isNewPeriod ? volume : volume + sumVol[1]
    sumSrcSrcVol := isNewPeriod ? volume * math.pow(src, 2) : volume * math.pow(src, 2) + sumSrcSrcVol[1]

    _vwap = sumSrcVol / sumVol
    variance = sumSrcSrcVol / sumVol - math.pow(_vwap, 2)
    variance := variance < 0 ? 0 : variance
    stDev = math.sqrt(variance)

    lowerBand = _vwap - stDev * stDevMultiplier
    upperBand = _vwap + stDev * stDevMultiplier

    [_vwap, lowerBand, upperBand]

// === INPUTS ===
hideonDWM = input(false, title="Hide VWAP on 1D or Above", group="VWAP Settings")
var anchor = input.string(defval="Session", title="Anchor Period",
    options=["Session", "Week", "Month", "Quarter", "Year", "Decade", "Century", "Earnings", "Dividends", "Splits"],
    group="VWAP Settings")
src = input(title="Source", defval=hlc3, group="VWAP Settings")
offset = input(0, title="Offset", group="VWAP Settings")

showBands = input(true, title="Calculate Bands", group="Standard Deviation Bands Settings")
stdevMult = input(1.0, title="Bands Multiplier", group="Standard Deviation Bands Settings")

// === ANCHOR PERIOD DETECTION ===
timeChange(period) => ta.change(time(period))

new_earnings = request.earnings(syminfo.tickerid, earnings.actual, barmerge.gaps_on, barmerge.lookahead_on, ignore_invalid_symbol=true)
new_dividends = request.dividends(syminfo.tickerid, dividends.gross, barmerge.gaps_on, barmerge.lookahead_on, ignore_invalid_symbol=true)
new_split = request.splits(syminfo.tickerid, splits.denominator, barmerge.gaps_on, barmerge.lookahead_on, ignore_invalid_symbol=true)

isNewPeriod = switch anchor
    "Earnings"  => not na(new_earnings)
    "Dividends" => not na(new_dividends)
    "Splits"    => not na(new_split)
    "Session"   => timeChange("D")
    "Week"      => timeChange("W")
    "Month"     => timeChange("M")
    "Quarter"   => timeChange("3M")
    "Year"      => timeChange("12M")
    "Decade"    => timeChange("12M") and year % 10 == 0
    "Century"   => timeChange("12M") and year % 100 == 0
    => false

isEsdAnchor = anchor == "Earnings" or anchor == "Dividends" or anchor == "Splits"
if na(src[1]) and not isEsdAnchor
    isNewPeriod := true

// === CALCULATION ===
float vwapValue = na
float upperBandValue = na
float lowerBandValue = na

if not (hideonDWM and timeframe.isdwm)
    [_vwap, bottom, top] = computeVWAP(src, isNewPeriod, stdevMult)
    vwapValue := _vwap
    upperBandValue := showBands ? top : na
    lowerBandValue := showBands ? bottom : na

// === PLOTTING ===
plot(vwapValue, title="VWAP", color=#2962FF, offset=offset)
upperBand = plot(upperBandValue, title="Upper Band", color=color.green, offset=offset)
lowerBand = plot(lowerBandValue, title="Lower Band", color=color.green, offset=offset)
fill(upperBand, lowerBand, title="Bands Fill", color=showBands ? color.new(color.green, 95) : na)
```

---

## Anchored VWAP Source Code (Manual Anchor Point)

```pinescript
//@version=5
indicator("Anchored VWAP", overlay=true, max_bars_back=5000)

// === INPUTS ===
anchorType = input.string("Time", title="Anchor Type", options=["Time", "Bar Index"])
anchorTime = input.time(timestamp("01 Jan 2024 09:15 +0530"), title="Anchor Date/Time")
anchorBarOffset = input.int(200, title="Anchor Bars Back", minval=1)
resetOnSession = input.bool(false, title="Reset on New Session?")

avwapColor = input.color(color.new(color.blue, 0), title="Line Color")
avwapWidth = input.int(2, title="Line Width", minval=1, maxval=4)

// === ANCHOR DETECTION ===
var int anchorIdx = na
varip bool anchorFound = false

if anchorType == "Time"
    if not anchorFound
        for i = 0 to bar_index
            if time[i] >= anchorTime
                anchorIdx := bar_index[i]
                anchorFound := true
                break
else
    anchorIdx := bar_index - anchorBarOffset

if na(anchorIdx) or anchorIdx < 0
    anchorIdx := 0

// === VWAP CALCULATION ===
var float cumulative_tp_volume = 0.0
var float cumulative_volume = 0.0
var float avwap_value = na

if resetOnSession
    if ta.change(time("D"))
        cumulative_tp_volume := 0.0
        cumulative_volume := 0.0

float tp = (high + low + close) / 3.0  // hlc3

if bar_index >= anchorIdx
    cumulative_tp_volume := cumulative_tp_volume + (tp * volume)
    cumulative_volume := cumulative_volume + volume
    avwap_value := cumulative_volume > 0 ? cumulative_tp_volume / cumulative_volume : tp
else
    avwap_value := na
    cumulative_tp_volume := 0.0
    cumulative_volume := 0.0

// === PLOTTING ===
plot(avwap_value, title="AVWAP", color=avwapColor, linewidth=avwapWidth)
plotshape(bar_index == anchorIdx ? high : na, title="Anchor Point",
    location=location.belowbar, color=color.white, style=shape.triangleup, size=size.small, text="Anchor")
```

---

## TypeScript Implementation Notes

When implementing in TypeScript/JavaScript:

1. **Session Detection**: Use date comparison to detect new trading sessions
2. **Source Options**: Implement `hlc3`, `hl2`, `ohlc4`, etc. as helper functions
3. **Cumulative State**: Track cumulative values that reset on new periods
4. **Variance Calculation**: Use the volume-weighted variance formula for std dev bands
5. **Band Multipliers**: Support multiple band levels with configurable multipliers

### Helper Functions Needed

```typescript
// Price source calculations
const hlc3 = (h: number, l: number, c: number) => (h + l + c) / 3;
const hl2 = (h: number, l: number) => (h + l) / 2;
const ohlc4 = (o: number, h: number, l: number, c: number) => (o + h + l + c) / 4;

// Period detection
const isNewSession = (currentTime: Date, prevTime: Date) =>
  currentTime.toDateString() !== prevTime.toDateString();

const isNewWeek = (currentTime: Date, prevTime: Date) =>
  getWeekNumber(currentTime) !== getWeekNumber(prevTime);

const isNewMonth = (currentTime: Date, prevTime: Date) =>
  currentTime.getMonth() !== prevTime.getMonth() ||
  currentTime.getFullYear() !== prevTime.getFullYear();
```
