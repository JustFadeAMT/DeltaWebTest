'use client';

import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format } from 'date-fns';
import type { PnlSnapshot } from '@/types';

interface PnlChartProps {
  snapshots: PnlSnapshot[];
  positionId: number;
}

type ChartView = 'total' | 'option' | 'perp';

const COLORS = {
  total: '#3b82f6',
  option: '#8b5cf6',
  perp: '#06b6d4',
};

export default function PnlChart({ snapshots, positionId }: PnlChartProps) {
  const [view, setView] = useState<ChartView>('total');

  if (!snapshots || snapshots.length === 0) {
    return (
      <div className="glass-card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Position #{positionId} PnL Chart
          </h4>
        </div>
        <div
          style={{
            height: '200px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            fontSize: '14px',
          }}
        >
          Waiting for PnL data...
        </div>
      </div>
    );
  }

  const chartData = snapshots.map((s) => ({
    time: new Date(s.timestamp).getTime(),
    total: s.total_pnl,
    option: s.option_pnl,
    perp: s.perp_pnl,
    underlying: s.underlying_price,
    delta: s.option_delta,
  }));

  const visibleLines: ChartView[] =
    view === 'total' ? ['total', 'option', 'perp'] : [view];

  return (
    <div className="glass-card" style={{ padding: '20px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}
      >
        <h4
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--text-secondary)',
          }}
        >
          Position #{positionId} PnL Chart
        </h4>
        <div style={{ display: 'flex', gap: '4px' }}>
          {(['total', 'option', 'perp'] as ChartView[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                padding: '4px 12px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
                background:
                  view === v ? 'var(--accent-blue)' : 'var(--bg-input)',
                color: view === v ? 'white' : 'var(--text-secondary)',
                transition: 'all 0.15s',
              }}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="chart-container">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border-primary)"
              opacity={0.5}
            />
            <XAxis
              dataKey="time"
              type="number"
              domain={['dataMin', 'dataMax']}
              tickFormatter={(ts) => format(new Date(ts), 'HH:mm')}
              stroke="var(--text-muted)"
              fontSize={11}
            />
            <YAxis
              stroke="var(--text-muted)"
              fontSize={11}
              tickFormatter={(v) => `$${v.toFixed(0)}`}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-primary)',
                borderRadius: '8px',
                fontSize: '12px',
                color: 'var(--text-primary)',
              }}
              labelFormatter={(ts) =>
                format(new Date(ts as number), 'MMM dd HH:mm:ss')
              }
              formatter={(value: number, name: string) => [
                `$${value.toFixed(2)}`,
                name.charAt(0).toUpperCase() + name.slice(1) + ' PnL',
              ]}
            />
            {visibleLines.includes('total') && (
              <Line
                type="monotone"
                dataKey="total"
                stroke={COLORS.total}
                strokeWidth={2}
                dot={false}
                name="Total"
              />
            )}
            {visibleLines.includes('option') && (
              <Line
                type="monotone"
                dataKey="option"
                stroke={COLORS.option}
                strokeWidth={view === 'option' ? 2 : 1}
                dot={false}
                name="Option"
                strokeDasharray={view === 'total' ? '4 2' : undefined}
              />
            )}
            {visibleLines.includes('perp') && (
              <Line
                type="monotone"
                dataKey="perp"
                stroke={COLORS.perp}
                strokeWidth={view === 'perp' ? 2 : 1}
                dot={false}
                name="Perp"
                strokeDasharray={view === 'total' ? '4 2' : undefined}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
