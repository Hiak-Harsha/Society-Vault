'use client';

import React from 'react';

export interface TimelineItem {
  title: string;
  description?: string;
  date: string;
  status: 'completed' | 'active' | 'pending';
  icon?: React.ReactNode;
}

interface TimelineProps {
  items: TimelineItem[];
}

export const Timeline: React.FC<TimelineProps> = ({ items }) => {
  return (
    <div className="timeline" style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      position: 'relative',
      paddingLeft: '32px'
    }}>
      {/* Central line */}
      <div style={{
        position: 'absolute',
        left: '11px',
        top: '8px',
        bottom: '8px',
        width: '2px',
        background: 'var(--border-color)',
        zIndex: 1
      }} />

      {items.map((item, index) => (
        <div key={index} className={`timeline-item fade-in`} style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          {/* Dot */}
          <div className={`timeline-dot ${item.status}`} style={{
            position: 'absolute',
            left: '-32px',
            top: '4px',
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: item.status === 'completed' 
              ? 'var(--accent-primary)' 
              : item.status === 'active' 
                ? 'var(--accent-secondary)' 
                : 'var(--bg-secondary)',
            border: `2px solid ${item.status === 'pending' ? 'var(--border-color)' : 'transparent'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: item.status === 'completed' ? '#0a0e1a' : '#ffffff',
            boxShadow: item.status === 'active' 
              ? '0 0 12px var(--accent-secondary)' 
              : item.status === 'completed'
                ? '0 0 12px var(--accent-primary)'
                : 'none',
            zIndex: 2
          }}>
            {item.icon ? item.icon : (
              item.status === 'completed' ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : null
            )}
          </div>

          <span className="timeline-title" style={{
            fontSize: '15px',
            fontWeight: '600',
            color: item.status === 'pending' ? 'var(--text-muted)' : 'var(--text-primary)'
          }}>{item.title}</span>

          {item.description && (
            <p className="timeline-description" style={{
              fontSize: '13px',
              color: 'var(--text-secondary)',
              margin: 0
            }}>{item.description}</p>
          )}

          <span style={{
            fontSize: '11px',
            color: 'var(--text-muted)',
            marginTop: '2px'
          }}>{item.date}</span>
        </div>
      ))}
    </div>
  );
};
