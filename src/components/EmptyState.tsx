'use client';

import React from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title, description, icon, action }) => {
  return (
    <div className="empty-state glass-card fade-in" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px 24px',
      textAlign: 'center',
      maxWidth: '480px',
      margin: '0 auto',
      gap: '16px'
    }}>
      {icon && (
        <div style={{
          color: 'var(--text-muted)',
          background: 'rgba(255,255,255,0.02)',
          padding: '16px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '4px'
        }}>
          {icon}
        </div>
      )}

      <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>{title}</h3>
      <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>{description}</p>

      {action && (
        <button 
          onClick={action.onClick} 
          className="btn btn-primary"
          style={{ marginTop: '8px', padding: '10px 20px', fontSize: '14px' }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
};
