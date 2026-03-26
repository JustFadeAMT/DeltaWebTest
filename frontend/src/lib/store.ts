/**
 * Global state store using Zustand.
 */

import { create } from 'zustand';

interface AppState {
  environment: string;
  isMainnet: boolean;
  deribitConnected: boolean;
  currentPrice: number | null;
  activeTab: string;
  setEnvironment: (env: string) => void;
  setDeribitConnected: (connected: boolean) => void;
  setCurrentPrice: (price: number) => void;
  setActiveTab: (tab: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  environment: 'testnet',
  isMainnet: false,
  deribitConnected: false,
  currentPrice: null,
  activeTab: 'monitor',
  setEnvironment: (env) => set({ environment: env, isMainnet: env === 'mainnet' }),
  setDeribitConnected: (connected) => set({ deribitConnected: connected }),
  setCurrentPrice: (price) => set({ currentPrice: price }),
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
