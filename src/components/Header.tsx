'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

interface HeaderProps {
  title: string;
  subtitle?: string;
  userName: string;
  userRole: string;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, userName, userRole }) => {
  const router = useRouter();

  const handleLogout = async () => {
    const res = await fetch('/api/auth/logout', { method: 'POST' });
    if (res.ok) {
      router.push('/login');
      router.refresh();
    }
  };

  return (
    <header className="header-bar" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 32px',
      borderBottom: '1px solid var(--border-color)',
      background: 'var(--glass-bg)',
      backdropFilter: 'blur(12px)',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      <div className="page-header" style={{ margin: 0 }}>
        <h1 className="page-title" style={{ fontSize: '24px', fontWeight: '800', margin: 0 }}>{title}</h1>
        {subtitle && <p className="page-subtitle" style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>{subtitle}</p>}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', textAlign: 'right' }}>
          <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>{userName}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{userRole}</span>
        </div>

        <div style={{ height: '24px', width: '1px', background: 'var(--border-color)' }} />

        <button 
          onClick={handleLogout} 
          className="btn btn-ghost" 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            padding: '8px 12px',
            fontSize: '13px'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Logout
        </button>
      </div>
    </header>
  );
};
