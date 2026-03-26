/**
 * TypeScript types for the Delta-Neutral Trading app.
 */

// ── Enums ────────────────────────────────────────────────────────

export type TradingMode = 'paper' | 'live';
export type OptionType = 'call' | 'put';
export type Side = 'buy' | 'sell';
export type PositionStatus = 'open' | 'closed' | 'error';

// ── Market Data ──────────────────────────────────────────────────

export interface UnderlyingPrice {
  symbol: string;
  price: number;
  timestamp: string;
}

export interface OptionInstrument {
  instrument_name: string;
  strike: number;
  expiry: string;
  option_type: string;
  mark_price?: number;
  bid?: number;
  ask?: number;
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
  iv?: number;
  underlying_price?: number;
}

export interface InstrumentDetail {
  instrument_name: string;
  mark_price: number;
  mark_iv: number;
  best_bid_price?: number;
  best_ask_price?: number;
  underlying_price: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  iv: number;
  open_interest: number;
  volume: number;
  timestamp: string;
}

export interface SuggestedHedge {
  option_instrument: string;
  option_delta: number;
  option_price: number;
  option_price_coin?: number;
  underlying_price: number;
  atm_strike: number;
  hedge_instrument: string;
  hedge_side: string;
  hedge_size: number;
  iv?: number;
  error?: string;
}

// ── Positions ────────────────────────────────────────────────────

export interface Position {
  id: number;
  mode: TradingMode;
  symbol: string;
  option_instrument_name: string;
  option_type: OptionType;
  strike: number;
  expiry: string;
  option_side: Side;
  option_size: number;
  perp_instrument_name: string;
  perp_side: Side;
  perp_size: number;
  entry_underlying_price: number;
  entry_option_price: number;
  entry_perp_price: number;
  entry_option_delta: number;
  entry_option_iv?: number;
  current_option_price?: number;
  current_perp_price?: number;
  current_underlying_price?: number;
  current_delta?: number;
  current_iv?: number;
  current_theta?: number;
  option_pnl: number;
  perp_pnl: number;
  total_pnl: number;
  notes?: string;
  status: PositionStatus;
  created_at: string;
  closed_at?: string;
}

export interface CreatePositionRequest {
  symbol: string;
  option_instrument_name: string;
  option_type: string;
  strike: number;
  expiry: string;
  option_size: number;
  perp_side: string;
  perp_size: number;
  notes?: string;
}

// ── PnL Snapshots ────────────────────────────────────────────────

export interface PnlSnapshot {
  id: number;
  position_id: number;
  timestamp: string;
  underlying_price: number;
  option_mark: number;
  perp_mark: number;
  option_delta?: number;
  option_iv?: number;
  option_theta?: number;
  option_pnl: number;
  perp_pnl: number;
  total_pnl: number;
}

// ── Portfolio ────────────────────────────────────────────────────

export interface PortfolioSummary {
  total_positions: number;
  open_positions: number;
  total_option_pnl: number;
  total_perp_pnl: number;
  total_pnl: number;
  net_delta: number;
  environment: string;
}

// ── Events ───────────────────────────────────────────────────────

export interface EventLog {
  id: number;
  event_type: string;
  message: string;
  details?: string;
  position_id?: number;
  created_at: string;
}

// ── Health ───────────────────────────────────────────────────────

export interface HealthStatus {
  status: string;
  environment: string;
  deribit_connected: boolean;
  version: string;
}
