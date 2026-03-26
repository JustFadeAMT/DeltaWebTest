'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Loader2, Info } from 'lucide-react';
import { api } from '@/lib/api';
import type { CreatePositionRequest, SuggestedHedge } from '@/types';

interface CreatePositionFormProps {
  mode: 'paper' | 'live';
  onSuccess?: () => void;
}

export default function CreatePositionForm({ mode, onSuccess }: CreatePositionFormProps) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [symbol, setSymbol] = useState('ETH');
  const [expiry, setExpiry] = useState('');
  const [optionType, setOptionType] = useState<'call' | 'put'>('call');
  const [strike, setStrike] = useState<number | ''>('');
  const [optionSize, setOptionSize] = useState(1);
  const [perpSide, setPerpSide] = useState<'buy' | 'sell'>('sell');
  const [perpSize, setPerpSize] = useState(0);
  const [notes, setNotes] = useState('');
  const [selectedInstrument, setSelectedInstrument] = useState('');

  // Fetch underlying price
  const { data: underlying } = useQuery({
    queryKey: ['underlying', symbol],
    queryFn: () => api.getUnderlying(symbol),
    refetchInterval: 10000,
  });

  // Fetch available expiries
  const { data: expiriesData } = useQuery({
    queryKey: ['expiries', symbol],
    queryFn: () => api.getExpiries(symbol),
  });

  // Fetch options chain for selected expiry
  const { data: chainData } = useQuery({
    queryKey: ['options-chain', symbol, expiry],
    queryFn: () => api.getOptionsChain(symbol, expiry),
    enabled: !!expiry,
  });

  // Fetch suggested hedge when instrument is selected
  const { data: hedge, isLoading: hedgeLoading } = useQuery({
    queryKey: ['suggested-hedge', selectedInstrument, optionType, optionSize],
    queryFn: () =>
      api.getSuggestedHedge({
        symbol,
        option_instrument: selectedInstrument,
        option_type: optionType,
        option_size: optionSize,
      }),
    enabled: !!selectedInstrument,
  });

  // Auto-set first expiry
  useEffect(() => {
    if (expiriesData?.expiries?.length && !expiry) {
      setExpiry(expiriesData.expiries[0]);
    }
  }, [expiriesData, expiry]);

  // Auto-update hedge suggestion
  useEffect(() => {
    if (hedge) {
      setPerpSide(hedge.hedge_side as 'buy' | 'sell');
      setPerpSize(hedge.hedge_size);
      if (!strike) {
        setStrike(hedge.atm_strike);
      }
    }
  }, [hedge, strike]);

  // Auto-set default hedge side when option type changes
  useEffect(() => {
    setPerpSide(optionType === 'call' ? 'sell' : 'buy');
  }, [optionType]);

  // Build instrument name when strike/expiry/type change
  useEffect(() => {
    if (strike && expiry) {
      const typeChar = optionType === 'call' ? 'C' : 'P';
      const inst = `${symbol}-${expiry}-${strike}-${typeChar}`;
      setSelectedInstrument(inst);
    }
  }, [symbol, strike, expiry, optionType]);

  // Get available strikes from options chain
  const availableStrikes = chainData?.instruments
    ? [...new Set(chainData.instruments.map((i: any) => i.strike))].sort(
        (a: number, b: number) => a - b
      )
    : [];

  // Create position mutation
  const createMutation = useMutation({
    mutationFn: (data: CreatePositionRequest) => api.createPaperPosition(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positions'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      setIsOpen(false);
      onSuccess?.();
    },
  });

  const handleSubmit = () => {
    if (!selectedInstrument || !strike || !expiry) return;

    createMutation.mutate({
      symbol,
      option_instrument_name: selectedInstrument,
      option_type: optionType,
      strike: Number(strike),
      expiry,
      option_size: optionSize,
      perp_side: perpSide,
      perp_size: perpSize,
      notes: notes || undefined,
    });
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="btn-primary"
        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
      >
        <Plus size={18} />
        New Position
      </button>
    );
  }

  return (
    <div className="glass-card glow-border animate-fade-in" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 700 }}>
          Create {mode === 'paper' ? 'Paper' : 'Live'} Position
        </h3>
        <button onClick={() => setIsOpen(false)} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>
          Cancel
        </button>
      </div>

      {/* Info Bar */}
      {underlying && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '20px',
            padding: '12px 16px',
            background: 'rgba(59, 130, 246, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            borderRadius: '8px',
            fontSize: '13px',
            marginBottom: '20px',
            alignItems: 'center',
          }}
        >
          <Info size={16} style={{ color: 'var(--accent-blue)' }} />
          <span>
            <strong>Current {symbol} Price:</strong>{' '}
            <span style={{ color: 'var(--accent-cyan)' }}>${underlying.price.toFixed(2)}</span>
          </span>
          {hedge && (
            <>
              <span>
                <strong>ATM Strike:</strong> ${hedge.atm_strike}
              </span>
              <span>
                <strong>Suggested Futures Size:</strong>{' '}
                <span style={{ color: 'var(--accent-cyan)' }}>
                  {hedge.hedge_size.toFixed(4)} {symbol} ({hedge.hedge_side === 'buy' ? 'Buy' : 'Sell'})
                </span>
              </span>
              <span>
                <strong>Delta:</strong>{' '}
                <span style={{ color: 'var(--accent-purple)' }}>
                  {hedge.option_delta.toFixed(4)} (from exchange)
                </span>
              </span>
            </>
          )}
        </div>
      )}

      {/* Form Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        {/* Symbol */}
        <div>
          <label className="form-label">Symbol</label>
          <select
            className="form-select"
            value={symbol}
            onChange={(e) => {
              setSymbol(e.target.value);
              setExpiry('');
              setStrike('');
            }}
          >
            <option value="ETH">ETH</option>
            <option value="BTC">BTC</option>
          </select>
        </div>

        {/* Expiry */}
        <div>
          <label className="form-label">Expiry</label>
          <select
            className="form-select"
            value={expiry}
            onChange={(e) => {
              setExpiry(e.target.value);
              setStrike('');
            }}
          >
            <option value="">Select expiry...</option>
            {expiriesData?.expiries?.map((exp: string) => (
              <option key={exp} value={exp}>
                {exp}
              </option>
            ))}
          </select>
        </div>

        {/* Strike */}
        <div>
          <label className="form-label">Strike Price</label>
          <select
            className="form-select"
            value={strike}
            onChange={(e) => setStrike(Number(e.target.value))}
          >
            <option value="">
              {availableStrikes.length ? 'Select strike...' : 'Select expiry first'}
            </option>
            {(availableStrikes as number[]).map((s) => (
              <option key={s} value={s}>
                ${s.toLocaleString()}
                {underlying && Math.abs(s - underlying.price) < 50 ? ' (ATM)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Option Type */}
        <div>
          <label className="form-label">Option Type</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['call', 'put'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setOptionType(t)}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  border: `1px solid ${optionType === t ? 'var(--accent-blue)' : 'var(--border-primary)'}`,
                  background: optionType === t ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-input)',
                  color: optionType === t ? 'var(--accent-blue)' : 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  textTransform: 'capitalize',
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Option Size */}
        <div>
          <label className="form-label">Option Size</label>
          <input
            type="number"
            className="form-input"
            value={optionSize}
            onChange={(e) => setOptionSize(Number(e.target.value))}
            min={0.1}
            step={0.1}
          />
        </div>

        {/* Perp Side */}
        <div>
          <label className="form-label">Perp Side</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['buy', 'sell'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setPerpSide(s)}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  border: `1px solid ${perpSide === s ? (s === 'buy' ? 'var(--green)' : 'var(--red)') : 'var(--border-primary)'}`,
                  background: perpSide === s
                    ? s === 'buy'
                      ? 'rgba(16, 185, 129, 0.15)'
                      : 'rgba(239, 68, 68, 0.15)'
                    : 'var(--bg-input)',
                  color: perpSide === s ? (s === 'buy' ? 'var(--green)' : 'var(--red)') : 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  textTransform: 'capitalize',
                }}
              >
                {s === 'buy' ? 'Buy (Long)' : 'Sell (Short)'}
              </button>
            ))}
          </div>
        </div>

        {/* Perp Size */}
        <div>
          <label className="form-label">
            Perp Size {hedgeLoading && <Loader2 size={12} style={{ display: 'inline' }} />}
          </label>
          <input
            type="number"
            className="form-input"
            value={perpSize}
            onChange={(e) => setPerpSize(Number(e.target.value))}
            min={0}
            step={0.0001}
          />
        </div>

        {/* Notes */}
        <div style={{ gridColumn: 'span 1' }}>
          <label className="form-label">Notes (optional)</label>
          <input
            type="text"
            className="form-input"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Strategy notes..."
          />
        </div>
      </div>

      {/* Error */}
      {createMutation.isError && (
        <div
          style={{
            padding: '12px 16px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            color: 'var(--red)',
            fontSize: '13px',
            marginBottom: '16px',
          }}
        >
          {(createMutation.error as Error)?.message || 'Failed to create position'}
        </div>
      )}

      {/* Submit */}
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
        <button onClick={() => setIsOpen(false)} className="btn-secondary">
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          className="btn-primary"
          disabled={!selectedInstrument || !strike || !expiry || createMutation.isPending}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          {createMutation.isPending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Plus size={16} />
          )}
          Create {mode === 'paper' ? 'Paper' : 'Live'} Position
        </button>
      </div>
    </div>
  );
}
