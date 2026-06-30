'use client';

import React from 'react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const getBadgeClass = () => {
    const s = status.toUpperCase();
    if (['CONFIRMED', 'APPROVED', 'ACCEPTED', 'ACTIVE', 'CLOSED'].includes(s)) {
      return 'badge-success';
    }
    if (['PENDING', 'PENDING_WITNESSES', 'PENDING_APPROVAL', 'DRAFT', 'REQUESTED'].includes(s)) {
      return 'badge-warning';
    }
    if (['REJECTED', 'DECLINED', 'INACTIVE'].includes(s)) {
      return 'badge-danger';
    }
    if (['DISBURSED', 'REPAYING'].includes(s)) {
      return 'badge-info';
    }
    return 'badge-neutral';
  };

  const getStatusDotClass = () => {
    const s = status.toUpperCase();
    if (['CONFIRMED', 'APPROVED', 'ACCEPTED', 'ACTIVE', 'CLOSED'].includes(s)) {
      return 'active';
    }
    if (['PENDING', 'PENDING_WITNESSES', 'PENDING_APPROVAL', 'DRAFT', 'REQUESTED'].includes(s)) {
      return 'warning';
    }
    if (['REJECTED', 'DECLINED', 'INACTIVE'].includes(s)) {
      return 'danger';
    }
    return 'inactive';
  };

  const formatStatusText = (text: string) => {
    return text
      .toLowerCase()
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const isPending = ['PENDING', 'PENDING_WITNESSES', 'PENDING_APPROVAL', 'REQUESTED'].includes(status.toUpperCase());

  return (
    <span className={`badge ${getBadgeClass()}`} style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      fontSize: size === 'sm' ? '11px' : '12px',
      padding: size === 'sm' ? '2px 8px' : '4px 10px',
      fontWeight: '600'
    }}>
      {isPending && (
        <span className={`status-dot ${getStatusDotClass()}`} />
      )}
      {formatStatusText(status)}
    </span>
  );
};
