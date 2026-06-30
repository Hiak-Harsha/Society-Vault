'use client';

import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: string;
  subtitle?: string;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon, trend, color = 'var(--accent-secondary)', subtitle, className = '' }) => {
  return (
    <div className={`glass-card glass-card-hover stat-card slide-up ${className}`} style={{
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Decorative background glow */}
      <div style={{
        position: 'absolute',
        top: '-24px',
        right: '-24px',
        width: '96px',
        height: '96px',
        borderRadius: '50%',
        background: color,
        filter: 'blur(40px)',
        opacity: 0.15,
        pointerEvents: 'none'
      }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="stat-label" style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-secondary)' }}>{title}</span>
        <div className="stat-icon" style={{
          color: color,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: '8px',
          padding: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {icon}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
        <span className="stat-value text-gradient" style={{
          fontSize: '28px',
          fontWeight: '800',
          letterSpacing: '-0.5px'
        }}>{value}</span>

        {trend && (
          <span className="stat-change" style={{
            fontSize: '12px',
            fontWeight: '600',
            color: trend.isPositive ? 'var(--accent-primary)' : 'var(--accent-danger)',
            display: 'flex',
            alignItems: 'center',
            gap: '2px'
          }}>
            {trend.isPositive ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="18 15 12 9 6 15" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            )}
            {trend.value}%
          </span>
        )}
      </div>

      {subtitle && (
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 'auto' }}>
          {subtitle}
        </span>
      )}
    </div>
  );
};
