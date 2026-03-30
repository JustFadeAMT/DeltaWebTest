'use client';

import { useQuery } from '@tanstack/react-query';
import { formatInTimeZone } from 'date-fns-tz';
import { TrendingUp, TrendingDown, X } from 'lucide-react';
import { api } from '@/lib/api';
import PnlChart from '@/components/charts/PnlChart';
import type { Position } from '@/types';

interface PositionCardProps {
  position: Position;
  onClose?: (id: number) => void;
}

function PnlValue({ value, label }: { value: number; label: string }) {
  const color = value >= 0 ? 'var(--green)' : 'var(--red)';
  const sign = value >= 0 ? '+' : '';
  return (
    <div>
      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>
        {label}
      </div>
      <div style={{ fontSize: '16px', fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>
        {sign}${value.toFixed(2)}
      </div>
    </div>
  );
}

export default function PositionCard({ position: pos, onClose }: PositionCardProps) {
  // Fetch PnL history for chart
  const { data: snapshots } = useQuery({
    queryKey: ['position-history', pos.id],
    queryFn: () => api.getPositionHistory(pos.id),
    refetchInterval: 15000,
    enabled: pos.status === 'open',
  });

  const isOpen = pos.status === 'open';
  const totalPnlColor = pos.total_pnl >= 0 ? 'var(--green)' : 'var(--red)';

  return (
    <div
      className="glass-card animate-fade-in"
      style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {pos.option_instrument_name}
            </h3>
            <span className={`badge ${isOpen ? 'badge-open' : 'badge-closed'}`}>
              {pos.status}
            </span>
            <span className={`badge ${pos.mode === 'paper' ? 'badge-paper' : 'badge-live'}`}>
              {pos.mode}
            </span>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {pos.option_size} options @ ${pos.entry_option_price.toFixed(2)} |{' '}
            {pos.perp_size.toFixed(4)} {pos.symbol} {pos.perp_side === 'buy' ? 'Buy' : 'Sell'} @{' '}
            ${pos.entry_perp_price.toFixed(2)}
          </div>
        </div>
        {isOpen && onClose && (
          <button
            onClick={() => onClose(pos.id)}
            className="btn-danger"
            style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <X size={14} />
            Close
          </button>
        )}
      </div>

      {/* Stats Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '16px',
          padding: '16px',
          background: 'var(--bg-input)',
          borderRadius: '10px',
        }}
      >
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>
            Current Option Price
          </div>
          <div style={{ fontSize: '14px', fontWeight: 600 }}>
            ${pos.current_option_price?.toFixed(2) ?? '–'}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>
            Current Underlying
          </div>
          <div style={{ fontSize: '14px', fontWeight: 600 }}>
            ${pos.current_underlying_price?.toFixed(2) ?? '–'}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>
            Current Perp Price
          </div>
          <div style={{ fontSize: '14px', fontWeight: 600 }}>
            ${pos.current_perp_price?.toFixed(2) ?? '–'}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>
            Delta / IV
          </div>
          <div style={{ fontSize: '14px', fontWeight: 600 }}>
            {pos.current_delta?.toFixed(4) ?? '–'} / {pos.current_iv?.toFixed(1) ?? '–'}%
          </div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>
            Theta (Open)
          </div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--red)' }}>
            {pos.current_theta?.toFixed(4) ?? '–'}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>
            Created
          </div>
          <div style={{ fontSize: '14px', fontWeight: 500 }}>
            {formatInTimeZone(new Date(pos.created_at), 'Asia/Bangkok', 'MMM dd HH:mm')}
          </div>
        </div>
      </div>

      {/* PnL Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '16px',
          padding: '16px',
          background: 'var(--bg-input)',
          borderRadius: '10px',
        }}
      >
        <PnlValue value={pos.option_pnl} label="Option PnL" />
        <PnlValue value={pos.perp_pnl} label="Perp PnL" />
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>
            Total PnL
          </div>
          <div
            style={{
              fontSize: '22px',
              fontWeight: 800,
              color: totalPnlColor,
              fontVariantNumeric: 'tabular-nums',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {pos.total_pnl >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
            {pos.total_pnl >= 0 ? '+' : ''}${pos.total_pnl.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Cost & Margin */}
      {(() => {
        const optionCost = pos.entry_option_price * pos.option_size;
        const perpNotional = pos.entry_perp_price * pos.perp_size;
        const estMargin = perpNotional * 0.1; // ~10x leverage on Deribit
        const totalCost = optionCost + estMargin;
        return (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '16px',
              padding: '16px',
              background: 'var(--bg-input)',
              borderRadius: '10px',
            }}
          >
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>
                Option Cost
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                ${optionCost.toFixed(2)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>
                Perp Notional
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                ${perpNotional.toFixed(2)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>
                Est. Margin Used
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: 'var(--text-secondary)' }}>
                ${estMargin.toFixed(2)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>
                Total Position Cost
              </div>
              <div style={{ fontSize: '14px', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--accent-blue)' }}>
                ${totalCost.toFixed(2)}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Chart */}
      {isOpen && (
        <PnlChart
          snapshots={snapshots || []}
          positionId={pos.id}
          currentPnl={{
            option_pnl: pos.option_pnl,
            perp_pnl: pos.perp_pnl,
            total_pnl: pos.total_pnl,
          }}
        />
      )}

      {/* Notes */}
      {pos.notes && (
        <div
          style={{
            fontSize: '13px',
            color: 'var(--text-muted)',
            fontStyle: 'italic',
            paddingTop: '4px',
          }}
        >
          📝 {pos.notes}
        </div>
      )}
    </div>
  );
}
