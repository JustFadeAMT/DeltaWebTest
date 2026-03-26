'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Layers,
  DollarSign,
  BarChart3,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import { useEffect } from 'react';

export default function MonitorPage() {
  const { setCurrentPrice, currentPrice, environment, deribitConnected } =
    useAppStore();

  // Fetch portfolio summary
  const { data: portfolio } = useQuery({
    queryKey: ['portfolio'],
    queryFn: () => api.getPortfolioSummary(),
    refetchInterval: 10000,
  });

  // Fetch underlying price
  const { data: underlying } = useQuery({
    queryKey: ['underlying', 'ETH'],
    queryFn: () => api.getUnderlying('ETH'),
    refetchInterval: 5000,
  });

  // Fetch events
  const { data: events } = useQuery({
    queryKey: ['events'],
    queryFn: () => api.getEvents(20),
    refetchInterval: 15000,
  });

  useEffect(() => {
    if (underlying?.price) setCurrentPrice(underlying.price);
  }, [underlying, setCurrentPrice]);

  const pnl = portfolio?.total_pnl ?? 0;
  const pnlColor = pnl >= 0 ? 'var(--green)' : 'var(--red)';

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '4px' }}>
          Monitor
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          Real-time portfolio overview and system status
        </p>
      </div>

      {/* Top Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
        }}
      >
        {/* Total PnL */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-label">Total PnL</div>
              <div className="stat-value" style={{ color: pnlColor }}>
                {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
              </div>
            </div>
            {pnl >= 0 ? (
              <TrendingUp size={24} style={{ color: 'var(--green)', opacity: 0.5 }} />
            ) : (
              <TrendingDown size={24} style={{ color: 'var(--red)', opacity: 0.5 }} />
            )}
          </div>
        </div>

        {/* Option PnL */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <div className="stat-label">Option PnL</div>
          <div
            className="stat-value"
            style={{
              color: (portfolio?.total_option_pnl ?? 0) >= 0 ? 'var(--green)' : 'var(--red)',
            }}
          >
            {(portfolio?.total_option_pnl ?? 0) >= 0 ? '+' : ''}$
            {(portfolio?.total_option_pnl ?? 0).toFixed(2)}
          </div>
        </div>

        {/* Perp PnL */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <div className="stat-label">Perp PnL</div>
          <div
            className="stat-value"
            style={{
              color: (portfolio?.total_perp_pnl ?? 0) >= 0 ? 'var(--green)' : 'var(--red)',
            }}
          >
            {(portfolio?.total_perp_pnl ?? 0) >= 0 ? '+' : ''}$
            {(portfolio?.total_perp_pnl ?? 0).toFixed(2)}
          </div>
        </div>

        {/* Net Delta */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-label">Net Delta</div>
              <div className="stat-value" style={{ color: 'var(--accent-cyan)' }}>
                {(portfolio?.net_delta ?? 0).toFixed(4)}
              </div>
            </div>
            <Activity size={24} style={{ color: 'var(--accent-cyan)', opacity: 0.5 }} />
          </div>
        </div>

        {/* Open Positions */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-label">Open Positions</div>
              <div className="stat-value">{portfolio?.open_positions ?? 0}</div>
            </div>
            <Layers size={24} style={{ color: 'var(--accent-purple)', opacity: 0.5 }} />
          </div>
        </div>

        {/* Live Underlying */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-label">ETH Price</div>
              <div className="stat-value" style={{ color: 'var(--accent-blue)' }}>
                ${underlying?.price?.toFixed(2) ?? '–'}
              </div>
            </div>
            <DollarSign size={24} style={{ color: 'var(--accent-blue)', opacity: 0.5 }} />
          </div>
        </div>
      </div>

      {/* Connection + Events */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
        {/* Connection Status */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {deribitConnected ? <Wifi size={18} style={{ color: 'var(--green)' }} /> : <WifiOff size={18} style={{ color: 'var(--red)' }} />}
            System Status
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Deribit API</span>
              <span style={{ color: deribitConnected ? 'var(--green)' : 'var(--red)' }}>
                {deribitConnected ? '● Connected' : '● Disconnected'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Environment</span>
              <span className={`badge ${environment === 'mainnet' ? 'badge-mainnet' : 'badge-testnet'}`}>
                {environment}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>PnL Snapshots</span>
              <span style={{ color: 'var(--green)' }}>● Active (30s)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Total Positions</span>
              <span>{portfolio?.total_positions ?? 0}</span>
            </div>
          </div>
        </div>

        {/* Recent Events */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart3 size={18} style={{ color: 'var(--accent-purple)' }} />
            Recent Events
          </h3>
          <div style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {events && events.length > 0 ? (
              events.map((evt) => (
                <div
                  key={evt.id}
                  style={{
                    padding: '10px 14px',
                    background: 'var(--bg-input)',
                    borderRadius: '8px',
                    fontSize: '13px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background:
                          evt.event_type === 'position_created'
                            ? 'var(--green)'
                            : evt.event_type === 'position_closed'
                            ? 'var(--red)'
                            : 'var(--accent-blue)',
                      }}
                    />
                    <span style={{ color: 'var(--text-primary)' }}>{evt.message}</span>
                  </div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '11px', whiteSpace: 'nowrap' }}>
                    {new Date(evt.created_at).toLocaleTimeString()}
                  </span>
                </div>
              ))
            ) : (
              <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>
                No events yet. Create a position to get started.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
