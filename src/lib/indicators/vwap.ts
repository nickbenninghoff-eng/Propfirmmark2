/**
 * VWAP (Volume Weighted Average Price) Implementation
 * Based on TradingView's Pine Script implementation
 *
 * Reference: docs/VWAP-REFERENCE.md
 */

import type { Time, LineData } from 'lightweight-charts';

// ============================================================================
// Types
// ============================================================================

export type VWAPAnchorPeriod =
  | 'Session'
  | 'Week'
  | 'Month'
  | 'Quarter'
  | 'Year'
  | 'Decade'
  | 'Century';

export type VWAPSource = 'hlc3' | 'hl2' | 'ohlc4' | 'close' | 'open' | 'high' | 'low';

export interface VWAPSettings {
  anchorPeriod: VWAPAnchorPeriod;
  source: VWAPSource;
  offset: number;
  showBands: boolean;
  bandMultiplier1: number;
  bandMultiplier2: number;
  bandMultiplier3: number;
  showBand1: boolean;
  showBand2: boolean;
  showBand3: boolean;
}

export interface VWAPResult<T = Time> {
  time: T;
  vwap: number;
  upperBand1?: number;
  lowerBand1?: number;
  upperBand2?: number;
  lowerBand2?: number;
  upperBand3?: number;
  lowerBand3?: number;
}

export interface Candle<T = Time> {
  time: T;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface AnchoredVWAPSettings {
  anchorTime?: number;        // Unix timestamp for time-based anchor
  anchorBarIndex?: number;    // Bar index for index-based anchor
  resetOnSession: boolean;
  source: VWAPSource;
  // Standard deviation bands
  showBands?: boolean;
  bandMultiplier1?: number;
  bandMultiplier2?: number;
  bandMultiplier3?: number;
  showBand1?: boolean;
  showBand2?: boolean;
  showBand3?: boolean;
}

export interface AnchoredVWAPResult<T = Time> {
  time: T;
  vwap: number | null;
  isAnchorBar: boolean;
  // Standard deviation bands
  upperBand1?: number;
  lowerBand1?: number;
  upperBand2?: number;
  lowerBand2?: number;
  upperBand3?: number;
  lowerBand3?: number;
}

// ============================================================================
// Default Settings
// ============================================================================

export const DEFAULT_VWAP_SETTINGS: VWAPSettings = {
  anchorPeriod: 'Session',
  source: 'hlc3',
  offset: 0,
  showBands: true,
  bandMultiplier1: 1.0,
  bandMultiplier2: 2.0,
  bandMultiplier3: 3.0,
  showBand1: true,
  showBand2: false,
  showBand3: false,
};

export const DEFAULT_ANCHORED_VWAP_SETTINGS: AnchoredVWAPSettings = {
  resetOnSession: false,
  source: 'hlc3',
};

// ============================================================================
// Price Source Helpers
// ============================================================================

export function getSourcePrice<T>(candle: Candle<T>, source: VWAPSource): number {
  switch (source) {
    case 'hlc3':
      return (candle.high + candle.low + candle.close) / 3;
    case 'hl2':
      return (candle.high + candle.low) / 2;
    case 'ohlc4':
      return (candle.open + candle.high + candle.low + candle.close) / 4;
    case 'close':
      return candle.close;
    case 'open':
      return candle.open;
    case 'high':
      return candle.high;
    case 'low':
      return candle.low;
    default:
      return (candle.high + candle.low + candle.close) / 3;
  }
}

// ============================================================================
// Period Detection Helpers
// ============================================================================

function getDateFromTimestamp(timestamp: number): Date {
  // Handle both seconds and milliseconds timestamps
  const ms = timestamp > 1e12 ? timestamp : timestamp * 1000;
  return new Date(ms);
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function getQuarter(date: Date): number {
  return Math.floor(date.getMonth() / 3) + 1;
}

export function isNewPeriod(
  currentTime: number,
  prevTime: number | null,
  anchorPeriod: VWAPAnchorPeriod
): boolean {
  if (prevTime === null) return true;

  const current = getDateFromTimestamp(currentTime);
  const prev = getDateFromTimestamp(prevTime);

  switch (anchorPeriod) {
    case 'Session':
      return current.toDateString() !== prev.toDateString();

    case 'Week':
      return getWeekNumber(current) !== getWeekNumber(prev) ||
             current.getFullYear() !== prev.getFullYear();

    case 'Month':
      return current.getMonth() !== prev.getMonth() ||
             current.getFullYear() !== prev.getFullYear();

    case 'Quarter':
      return getQuarter(current) !== getQuarter(prev) ||
             current.getFullYear() !== prev.getFullYear();

    case 'Year':
      return current.getFullYear() !== prev.getFullYear();

    case 'Decade':
      const currentDecade = Math.floor(current.getFullYear() / 10);
      const prevDecade = Math.floor(prev.getFullYear() / 10);
      return currentDecade !== prevDecade;

    case 'Century':
      const currentCentury = Math.floor(current.getFullYear() / 100);
      const prevCentury = Math.floor(prev.getFullYear() / 100);
      return currentCentury !== prevCentury;

    default:
      return false;
  }
}

// ============================================================================
// VWAP Calculation (TradingView Implementation)
// ============================================================================

interface VWAPState {
  sumSrcVol: number;
  sumVol: number;
  sumSrcSrcVol: number;
}

function computeVWAPBar(
  src: number,
  volume: number,
  isNewPeriod: boolean,
  prevState: VWAPState | null,
  stDevMultipliers: number[]
): { vwap: number; bands: { upper: number; lower: number }[]; state: VWAPState } {

  // Initialize or reset state on new period
  const state: VWAPState = isNewPeriod || !prevState
    ? {
        sumSrcVol: src * volume,
        sumVol: volume,
        sumSrcSrcVol: volume * Math.pow(src, 2),
      }
    : {
        sumSrcVol: src * volume + prevState.sumSrcVol,
        sumVol: volume + prevState.sumVol,
        sumSrcSrcVol: volume * Math.pow(src, 2) + prevState.sumSrcSrcVol,
      };

  // Calculate VWAP
  const vwap = state.sumSrcVol / state.sumVol;

  // Calculate variance and standard deviation
  let variance = state.sumSrcSrcVol / state.sumVol - Math.pow(vwap, 2);
  variance = variance < 0 ? 0 : variance;
  const stDev = Math.sqrt(variance);

  // Calculate bands for each multiplier
  const bands = stDevMultipliers.map(mult => ({
    upper: vwap + stDev * mult,
    lower: vwap - stDev * mult,
  }));

  return { vwap, bands, state };
}

/**
 * Convert Time to number for date calculations
 */
function timeToNumber(time: Time): number {
  if (typeof time === 'number') return time;
  // Handle business day string format (YYYY-MM-DD)
  if (typeof time === 'string') {
    return Math.floor(new Date(time).getTime() / 1000);
  }
  // Handle object format { year, month, day }
  if (typeof time === 'object' && 'year' in time) {
    return Math.floor(new Date(time.year, time.month - 1, time.day).getTime() / 1000);
  }
  return 0;
}

/**
 * Calculate VWAP for an array of candles
 * Based on TradingView's VWAP indicator implementation
 */
export function calculateVWAP<T extends Time>(
  candles: Candle<T>[],
  settings: Partial<VWAPSettings> = {}
): VWAPResult<T>[] {
  const config: VWAPSettings = { ...DEFAULT_VWAP_SETTINGS, ...settings };
  const results: VWAPResult<T>[] = [];

  if (candles.length === 0) return results;

  // Check for volume data
  const hasVolume = candles.some(c => c.volume > 0);
  if (!hasVolume) {
    console.warn('[VWAP] No volume data available');
    return results;
  }

  let prevState: VWAPState | null = null;
  let prevTime: number | null = null;

  // Collect multipliers for bands that are enabled
  const multipliers: number[] = [];
  if (config.showBands && config.showBand1) multipliers.push(config.bandMultiplier1);
  if (config.showBands && config.showBand2) multipliers.push(config.bandMultiplier2);
  if (config.showBands && config.showBand3) multipliers.push(config.bandMultiplier3);

  for (const candle of candles) {
    const volume = candle.volume || 1; // Fallback to 1 if no volume
    const src = getSourcePrice(candle, config.source);
    const timeNum = timeToNumber(candle.time);
    const newPeriod = isNewPeriod(timeNum, prevTime, config.anchorPeriod);

    const { vwap, bands, state } = computeVWAPBar(
      src,
      volume,
      newPeriod,
      prevState,
      multipliers.length > 0 ? multipliers : [1.0]
    );

    const result: VWAPResult<T> = {
      time: candle.time,
      vwap,
    };

    // Add bands if enabled
    if (config.showBands) {
      if (config.showBand1 && bands[0]) {
        result.upperBand1 = bands[0].upper;
        result.lowerBand1 = bands[0].lower;
      }
      if (config.showBand2 && bands[1]) {
        result.upperBand2 = bands[1].upper;
        result.lowerBand2 = bands[1].lower;
      }
      if (config.showBand3 && bands[2]) {
        result.upperBand3 = bands[2].upper;
        result.lowerBand3 = bands[2].lower;
      }
    }

    results.push(result);
    prevState = state;
    prevTime = timeNum;
  }

  // Apply offset if specified
  if (config.offset !== 0) {
    // Offset shifts the data forward (positive) or backward (negative)
    // For charting, we typically just return the data and let the chart handle offset
    // But if needed, we could shift the time values here
  }

  return results;
}

// ============================================================================
// Anchored VWAP Calculation
// ============================================================================

/**
 * Calculate Anchored VWAP starting from a specific point
 * Based on TradingView's Anchored VWAP drawing tool
 */
export function calculateAnchoredVWAP<T extends Time>(
  candles: Candle<T>[],
  settings: Partial<AnchoredVWAPSettings> = {}
): AnchoredVWAPResult<T>[] {
  const config: AnchoredVWAPSettings = { ...DEFAULT_ANCHORED_VWAP_SETTINGS, ...settings };
  const results: AnchoredVWAPResult<T>[] = [];

  if (candles.length === 0) return results;

  // Determine anchor index
  let anchorIndex = 0;

  if (config.anchorTime !== undefined) {
    // Find the bar at or after the anchor time
    anchorIndex = candles.findIndex(c => timeToNumber(c.time) >= config.anchorTime!);
    if (anchorIndex === -1) anchorIndex = candles.length; // No bars after anchor
  } else if (config.anchorBarIndex !== undefined) {
    anchorIndex = Math.max(0, config.anchorBarIndex);
  }

  let sumSrcVol = 0;
  let sumVol = 0;
  let sumSrcSrcVol = 0;
  let prevTime: number | null = null;

  // Default band multipliers
  const mult1 = config.bandMultiplier1 ?? 1.0;
  const mult2 = config.bandMultiplier2 ?? 2.0;
  const mult3 = config.bandMultiplier3 ?? 3.0;

  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i];
    const isAnchorBar = i === anchorIndex;
    const timeNum = timeToNumber(candle.time);

    // Reset on new session if enabled
    if (config.resetOnSession && prevTime !== null) {
      if (isNewPeriod(timeNum, prevTime, 'Session')) {
        sumSrcVol = 0;
        sumVol = 0;
        sumSrcSrcVol = 0;
      }
    }

    // Only calculate VWAP from anchor point onwards
    if (i >= anchorIndex) {
      const src = getSourcePrice(candle, config.source);
      const volume = candle.volume || 1;

      // Reset on anchor bar
      if (isAnchorBar) {
        sumSrcVol = src * volume;
        sumVol = volume;
        sumSrcSrcVol = volume * Math.pow(src, 2);
      } else {
        sumSrcVol += src * volume;
        sumVol += volume;
        sumSrcSrcVol += volume * Math.pow(src, 2);
      }

      const vwap = sumVol > 0 ? sumSrcVol / sumVol : src;

      // Calculate variance and standard deviation for bands
      let variance = sumSrcSrcVol / sumVol - Math.pow(vwap, 2);
      variance = variance < 0 ? 0 : variance;
      const stDev = Math.sqrt(variance);

      const result: AnchoredVWAPResult<T> = {
        time: candle.time,
        vwap,
        isAnchorBar,
      };

      // Add bands if enabled
      if (config.showBands) {
        if (config.showBand1) {
          result.upperBand1 = vwap + stDev * mult1;
          result.lowerBand1 = vwap - stDev * mult1;
        }
        if (config.showBand2) {
          result.upperBand2 = vwap + stDev * mult2;
          result.lowerBand2 = vwap - stDev * mult2;
        }
        if (config.showBand3) {
          result.upperBand3 = vwap + stDev * mult3;
          result.lowerBand3 = vwap - stDev * mult3;
        }
      }

      results.push(result);
    } else {
      results.push({
        time: candle.time,
        vwap: null,
        isAnchorBar: false,
      });
    }

    prevTime = timeNum;
  }

  return results;
}

// ============================================================================
// Utility Functions for Chart Integration
// ============================================================================

/**
 * Convert VWAP results to lightweight-charts line series format
 */
export function vwapToLineSeries<T extends Time>(results: VWAPResult<T>[]): LineData<T>[] {
  return results.map(r => ({
    time: r.time,
    value: r.vwap,
  }));
}

/**
 * Convert VWAP band results to lightweight-charts line series format
 */
export function vwapBandsToLineSeries<T extends Time>(
  results: VWAPResult<T>[],
  band: 1 | 2 | 3,
  type: 'upper' | 'lower'
): LineData<T>[] {
  return results
    .filter(r => {
      if (band === 1) return r.upperBand1 !== undefined;
      if (band === 2) return r.upperBand2 !== undefined;
      if (band === 3) return r.upperBand3 !== undefined;
      return false;
    })
    .map(r => ({
      time: r.time,
      value: type === 'upper'
        ? (band === 1 ? r.upperBand1! : band === 2 ? r.upperBand2! : r.upperBand3!)
        : (band === 1 ? r.lowerBand1! : band === 2 ? r.lowerBand2! : r.lowerBand3!),
    }));
}

/**
 * Convert Anchored VWAP results to lightweight-charts line series format
 */
export function anchoredVwapToLineSeries<T extends Time>(
  results: AnchoredVWAPResult<T>[]
): LineData<T>[] {
  return results
    .filter(r => r.vwap !== null)
    .map(r => ({
      time: r.time,
      value: r.vwap!,
    }));
}

/**
 * Convert Anchored VWAP band results to lightweight-charts line series format
 */
export function anchoredVwapBandsToLineSeries<T extends Time>(
  results: AnchoredVWAPResult<T>[],
  band: 1 | 2 | 3,
  type: 'upper' | 'lower'
): LineData<T>[] {
  return results
    .filter(r => {
      if (r.vwap === null) return false;
      if (band === 1) return r.upperBand1 !== undefined;
      if (band === 2) return r.upperBand2 !== undefined;
      if (band === 3) return r.upperBand3 !== undefined;
      return false;
    })
    .map(r => ({
      time: r.time,
      value: type === 'upper'
        ? (band === 1 ? r.upperBand1! : band === 2 ? r.upperBand2! : r.upperBand3!)
        : (band === 1 ? r.lowerBand1! : band === 2 ? r.lowerBand2! : r.lowerBand3!),
    }));
}
