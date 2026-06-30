'use client';

import React from 'react';
import { Modal } from './Modal';
import { formatCurrency, formatDateTime } from '@/lib/utils';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: {
    id: string;
    type: string; // DEPOSIT, WITHDRAWAL, REPAYMENT
    amount: number;
    paymentMethod: string;
    referenceNumber: string;
    description: string | null;
    timestamp: string;
    member?: {
      name: string;
      employeeId: string;
      email: string;
      rank: string | null;
    } | null;
  } | null;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ isOpen, onClose, transaction }) => {
  if (!transaction) return null;

  const handlePrint = () => {
    window.print();
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case 'DEPOSIT': return 'Contribution Savings Deposit';
      case 'WITHDRAWAL': return 'Loan Disbursement Outflow';
      case 'REPAYMENT': return 'Loan Repayment EMI Settled';
      default:
        return type;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Transaction Receipt"
      size="md"
      footer={(
        <>
          <button onClick={onClose} className="btn btn-ghost">Close</button>
          <button onClick={handlePrint} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            Print Slip
          </button>
        </>
      )}
    >
      <div id="printable-receipt" style={{
        padding: '16px',
        background: '#0e1424',
        border: '1px dashed var(--border-color)',
        borderRadius: '8px',
        color: '#f1f5f9',
        fontSize: '13px'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
          <h4 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }} className="text-gradient">SocietyVault Receipt</h4>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Cooperative Lending System</span>
        </div>

        {/* Info list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Transaction Reference:</span>
            <span style={{ fontFamily: 'monospace', fontWeight: '600' }}>{transaction.referenceNumber}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Ledger Category:</span>
            <span style={{ fontWeight: '600' }}>{getTypeName(transaction.type)}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Payment Method:</span>
            <span style={{ fontWeight: '600' }}>{transaction.paymentMethod}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Timestamp:</span>
            <span style={{ fontWeight: '600' }}>{formatDateTime(transaction.timestamp)}</span>
          </div>

          <div style={{ height: '1px', background: 'var(--border-color)', margin: '4px 0' }} />

          {transaction.member && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Employee Name:</span>
                <span style={{ fontWeight: '600' }}>{transaction.member.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Employee ID:</span>
                <span style={{ fontWeight: '600' }}>{transaction.member.employeeId}</span>
              </div>
              {transaction.member.rank && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Employee Rank:</span>
                  <span style={{ fontWeight: '600' }}>{transaction.member.rank}</span>
                </div>
              )}
              <div style={{ height: '1px', background: 'var(--border-color)', margin: '4px 0' }} />
            </>
          )}

          {transaction.description && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Description:</span>
              <span style={{ background: 'rgba(0,0,0,0.1)', padding: '8px 12px', borderRadius: '4px', fontStyle: 'italic' }}>
                {transaction.description}
              </span>
            </div>
          )}

          <div style={{
            background: 'rgba(16, 185, 129, 0.05)',
            border: '1px solid rgba(16, 185, 129, 0.1)',
            borderRadius: '6px',
            padding: '16px',
            textAlign: 'center',
            marginTop: '12px'
          }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Amount Processed</span>
            <h3 style={{ margin: '4px 0 0 0', fontSize: '24px', fontWeight: '800', color: 'var(--accent-primary)' }}>
              {formatCurrency(transaction.amount)}
            </h3>
          </div>
        </div>

        {/* Footer stamp */}
        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{
            border: '2px solid var(--accent-primary)',
            color: 'var(--accent-primary)',
            padding: '6px 12px',
            fontSize: '11px',
            fontWeight: '800',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            transform: 'rotate(-5deg)',
            opacity: 0.85,
            borderRadius: '4px'
          }}>
            Verified & Certified
          </div>
        </div>
      </div>
    </Modal>
  );
};
