'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BarChart3, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import PositionCard from '@/components/positions/PositionCard';
import CreatePositionForm from '@/components/positions/CreatePositionForm';

export default function PaperTradingPage() {
  const queryClient = useQueryClient();
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Fetch paper positions
  const { data: positions, isLoading } = useQuery({
    queryKey: ['positions', 'paper'],
    queryFn: () => api.getPositions('paper'),
    refetchInterval: 10000,
  });

  // Close position mutation
  const closeMutation = useMutation({
    mutationFn: (id: number) => api.closePosition(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positions'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
    },
  });

  // Clear all closed positions mutation
  const clearClosedMutation = useMutation({
    mutationFn: () => api.clearClosedPositions('paper'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positions'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      setShowClearConfirm(false);
    },
  });

  const openPositions = positions?.filter((p) => p.status === 'open') ?? [];
  const closedPositions = positions?.filter((p) => p.status === 'closed') ?? [];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 700 }}>Paper Trading</h1>
            <span className="badge badge-paper">Paper</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Simulate delta-neutral strategies with real market data from Deribit
          </p>
        </div>
        <CreatePositionForm mode="paper" />
      </div>

      {/* Open Positions */}
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BarChart3 size={20} style={{ color: 'var(--accent-blue)' }} />
          Open Positions ({openPositions.length})
        </h2>

        {isLoading ? (
          <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading positions...
          </div>
        ) : openPositions.length === 0 ? (
          <div
            className="glass-card"
            style={{
              padding: '60px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <BarChart3 size={48} style={{ opacity: 0.3 }} />
            <div style={{ fontSize: '16px' }}>No open positions</div>
            <div style={{ fontSize: '13px' }}>
              Click &quot;+ New Position&quot; to create your first delta-neutral paper trade
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {openPositions.map((pos) => (
              <PositionCard
                key={pos.id}
                position={pos}
                onClose={(id) => closeMutation.mutate(id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Closed Positions */}
      {closedPositions.length > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2
              style={{
                fontSize: '18px',
                fontWeight: 600,
                color: 'var(--text-secondary)',
              }}
            >
              Closed Positions ({closedPositions.length})
            </h2>

            {/* Clear Closed Button / Confirm */}
            {!showClearConfirm ? (
              <button
                onClick={() => setShowClearConfirm(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  background: 'transparent',
                  border: '1px solid var(--border-primary)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--red)';
                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-muted)';
                  e.currentTarget.style.borderColor = 'var(--border-primary)';
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <Trash2 size={14} />
                Clear History
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--red)', fontWeight: 600 }}>
                  Delete {closedPositions.length} closed position{closedPositions.length > 1 ? 's' : ''}?
                </span>
                <button
                  onClick={() => clearClosedMutation.mutate()}
                  disabled={clearClosedMutation.isPending}
                  className="btn-danger"
                  style={{
                    padding: '5px 12px',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Trash2 size={13} />
                  {clearClosedMutation.isPending ? 'Deleting...' : 'Confirm'}
                </button>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  style={{
                    padding: '5px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {closedPositions.map((pos) => (
              <PositionCard key={pos.id} position={pos} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

