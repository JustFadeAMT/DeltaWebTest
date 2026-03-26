'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAppStore } from '@/lib/store';

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5000,
            refetchInterval: 10000,
            retry: 2,
          },
        },
      })
  );

  const { setEnvironment, setDeribitConnected } = useAppStore();

  // Check health on mount
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const health = await api.getHealth();
        setEnvironment(health.environment);
        setDeribitConnected(health.deribit_connected);
      } catch {
        setDeribitConnected(false);
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, [setEnvironment, setDeribitConnected]);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
