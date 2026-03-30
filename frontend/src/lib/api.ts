/**
 * API client for the Delta-Neutral Trading backend.
 * Uses fetch to communicate with the FastAPI server.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(typeof error.detail === 'string' ? error.detail : JSON.stringify(error.detail));
  }

  return res.json();
}

// ── Health ────────────────────────────────────────────────────────

import type {
  CreatePositionRequest,
  EventLog,
  HealthStatus,
  InstrumentDetail,
  PnlSnapshot,
  PortfolioSummary,
  Position,
  SuggestedHedge,
  UnderlyingPrice,
} from '@/types';

export const api = {
  // Health
  getHealth: () => request<HealthStatus>('/api/health'),
  getEnvironment: () => request<{ environment: string; is_mainnet: boolean }>('/api/environment'),

  // Market Data
  getUnderlying: (symbol = 'ETH') =>
    request<UnderlyingPrice>(`/api/market/underlying?symbol=${symbol}`),

  getExpiries: (symbol = 'ETH') =>
    request<{ symbol: string; expiries: string[] }>(`/api/market/expiries?symbol=${symbol}`),

  getOptionsChain: (symbol = 'ETH', expiry?: string) => {
    const params = new URLSearchParams({ symbol });
    if (expiry) params.set('expiry', expiry);
    return request<{ instruments: any[] }>(`/api/market/options-chain?${params}`);
  },

  getInstrument: (name: string) =>
    request<InstrumentDetail>(`/api/market/instrument/${name}`),

  getSuggestedHedge: (params: {
    symbol?: string;
    option_instrument?: string;
    option_type?: string;
    option_size?: number;
    strike?: number;
    expiry?: string;
  }) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined) searchParams.set(k, String(v));
    });
    return request<SuggestedHedge>(`/api/market/suggested-hedge?${searchParams}`);
  },

  // Positions
  getPositions: (mode?: string, status?: string) => {
    const params = new URLSearchParams();
    if (mode) params.set('mode', mode);
    if (status) params.set('status', status);
    return request<Position[]>(`/api/positions?${params}`);
  },

  createPaperPosition: (data: CreatePositionRequest) =>
    request<Position>('/api/positions/paper', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getPosition: (id: number) =>
    request<Position>(`/api/positions/${id}`),

  closePosition: (id: number) =>
    request<Position>(`/api/positions/${id}/close`, { method: 'POST' }),

  deletePosition: (id: number) =>
    request<{ message: string }>(`/api/positions/${id}`, { method: 'DELETE' }),

  clearClosedPositions: (mode?: string) => {
    const params = new URLSearchParams();
    if (mode) params.set('mode', mode);
    return request<{ message: string; deleted: number }>(`/api/positions/closed?${params}`, { method: 'DELETE' });
  },

  getPositionHistory: (id: number, limit = 500) =>
    request<PnlSnapshot[]>(`/api/positions/${id}/history?limit=${limit}`),

  // Portfolio
  getPortfolioSummary: () =>
    request<PortfolioSummary>('/api/portfolio/summary'),

  getEvents: (limit = 50) =>
    request<EventLog[]>(`/api/portfolio/events?limit=${limit}`),
};
