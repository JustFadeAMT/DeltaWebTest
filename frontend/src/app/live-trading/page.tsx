'use client';

import { AlertTriangle, Shield, Zap } from 'lucide-react';

export default function LiveTradingPage() {
  return (
    <div
      className="animate-fade-in"
      style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
    >
      {/* Header */}
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '4px',
          }}
        >
          <h1 style={{ fontSize: '28px', fontWeight: 700 }}>Live Trading</h1>
          <span className="badge badge-live">REAL</span>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          Execute delta-neutral strategies with real orders on Deribit
        </p>
      </div>

      {/* Risk Warning */}
      <div
        style={{
          padding: '20px',
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          borderRadius: '12px',
          display: 'flex',
          gap: '16px',
          alignItems: 'flex-start',
        }}
      >
        <AlertTriangle
          size={24}
          style={{ color: 'var(--red)', flexShrink: 0, marginTop: '2px' }}
        />
        <div>
          <h3
            style={{
              fontSize: '16px',
              fontWeight: 700,
              color: 'var(--red)',
              marginBottom: '8px',
            }}
          >
            Risk Warning
          </h3>
          <p
            style={{
              fontSize: '14px',
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
            }}
          >
            Live trading involves real money and carries significant risk.
            Options trading can result in losses exceeding your initial
            investment. Delta-neutral strategies are not risk-free — they carry
            gamma risk, theta decay, and execution risk. Always use appropriate
            position sizing and risk limits.
          </p>
        </div>
      </div>

      {/* Safety Checks */}
      <div
        className="glass-card"
        style={{ padding: '24px' }}
      >
        <h3
          style={{
            fontSize: '18px',
            fontWeight: 600,
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Shield size={20} style={{ color: 'var(--accent-blue)' }} />
          Safety Controls
        </h3>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '16px',
          }}
        >
          {/* Safety Items */}
          {[
            {
              label: 'Environment',
              value: 'Testnet (Default)',
              status: 'safe',
              desc: 'Mainnet requires explicit environment flag',
            },
            {
              label: 'Max Order Notional',
              value: '$50,000',
              status: 'safe',
              desc: 'Per-order limit to prevent fat-finger errors',
            },
            {
              label: 'Max Live Positions',
              value: '5',
              status: 'safe',
              desc: 'Concurrent live position limit',
            },
            {
              label: 'Max Daily Loss',
              value: '$10,000',
              status: 'safe',
              desc: 'Daily loss limit triggers kill switch',
            },
            {
              label: 'Order Confirmation',
              value: 'Required',
              status: 'safe',
              desc: 'Modal confirmation before every live order',
            },
            {
              label: 'Kill Switch',
              value: 'Available',
              status: 'safe',
              desc: 'Emergency halt all live trading activity',
            },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                padding: '16px',
                background: 'var(--bg-input)',
                borderRadius: '10px',
                border: '1px solid var(--border-primary)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '4px',
                }}
              >
                <span style={{ fontSize: '14px', fontWeight: 600 }}>
                  {item.label}
                </span>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--green)',
                  }}
                >
                  {item.value}
                </span>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {item.desc}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Coming Soon */}
      <div
        className="glass-card"
        style={{
          padding: '60px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <Zap
          size={48}
          style={{ color: 'var(--accent-blue)', opacity: 0.3 }}
        />
        <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-secondary)' }}>
          Live Trading — Coming in Phase 2
        </div>
        <div style={{ fontSize: '14px', color: 'var(--text-muted)', maxWidth: '500px' }}>
          Real order execution on Deribit Testnet is coming soon. Start with Paper Trading to test your delta-neutral strategies with real market data.
        </div>
      </div>
    </div>
  );
}
