'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Activity, BarChart3, Clock, Zap } from 'lucide-react';
import { useAppStore } from '@/lib/store';

function ThaiClock() {
  const [time, setTime] = useState('');

  useEffect(() => {
    const update = () => {
      setTime(
        new Date().toLocaleString('th-TH', {
          timeZone: 'Asia/Bangkok',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      );
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  if (!time) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '13px',
        color: 'var(--text-secondary)',
        fontVariantNumeric: 'tabular-nums',
        padding: '4px 10px',
        background: 'var(--bg-input)',
        borderRadius: '6px',
        border: '1px solid var(--border-primary)',
      }}
    >
      <Clock size={14} style={{ color: 'var(--accent-cyan)' }} />
      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{time}</span>
      <span style={{ fontSize: '10px', opacity: 0.7 }}>ICT</span>
    </div>
  );
}

const tabs = [
  { name: 'Monitor', href: '/monitor', icon: Activity },
  { name: 'Paper Trading', href: '/paper-trading', icon: BarChart3 },
  { name: 'Live Trading', href: '/live-trading', icon: Zap },
];

export default function Navigation() {
  const pathname = usePathname();
  const { environment, deribitConnected } = useAppStore();

  return (
    <nav
      style={{
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-primary)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Logo + Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          <Link
            href="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              textDecoration: 'none',
              color: 'var(--text-primary)',
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                fontWeight: 700,
              }}
            >
              Δ
            </div>
            <span style={{ fontSize: '16px', fontWeight: 600 }}>DeltaNeutral</span>
          </Link>

          <div style={{ display: 'flex', gap: '4px' }}>
            {tabs.map((tab) => {
              const isActive =
                pathname === tab.href ||
                (tab.href === '/monitor' && pathname === '/');
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`nav-tab ${isActive ? 'active' : ''}`}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <Icon size={16} />
                  {tab.name}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right section: clock + environment + status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ThaiClock />
          <span
            className={`badge ${environment === 'mainnet' ? 'badge-mainnet' : 'badge-testnet'}`}
          >
            {environment}
          </span>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              color: deribitConnected ? 'var(--green)' : 'var(--text-muted)',
            }}
          >
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: deribitConnected ? 'var(--green)' : 'var(--text-muted)',
              }}
              className={deribitConnected ? 'pulse-green' : ''}
            />
            {deribitConnected ? 'Connected' : 'Disconnected'}
          </div>
        </div>
      </div>
    </nav>
  );
}
