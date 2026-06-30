'use client';

import React, { useEffect, useState } from 'react';
import { DataTable, Column } from '@/components/DataTable';
import { ReceiptModal } from '@/components/ReceiptModal';
import { useWorkspace } from '@/context/WorkspaceContext';
import { formatCurrency, formatDate } from '@/lib/utils';

interface Transaction {
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
}

export default function TransactionsPage() {
  const { transactions: rawTransactions, fetchTransactions } = useWorkspace();
  const transactions = rawTransactions as unknown as Transaction[];
  const [loading, setLoading] = useState(!transactions || transactions.length === 0);
  
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      await fetchTransactions();
      if (isMounted) {
        setLoading(false);
      }
    };
    const timer = setTimeout(() => {
      init();
    }, 0);
    return () => {
      clearTimeout(timer);
      isMounted = false;
    };
  }, [fetchTransactions]);

  const handleRowClick = (row: Transaction) => {
    setSelectedTxn(row);
    setIsReceiptOpen(true);
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case 'DEPOSIT': return 'Deposit (Savings)';
      case 'WITHDRAWAL': return 'Withdrawal (Disbursed)';
      case 'REPAYMENT': return 'Repayment (EMI)';
      default:
        return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'DEPOSIT': return 'var(--accent-primary)';
      case 'WITHDRAWAL': return 'var(--accent-danger)';
      case 'REPAYMENT': return 'var(--accent-info)';
      default:
        return 'var(--text-primary)';
    }
  };

  const columns: Column<Transaction>[] = [
    {
      key: 'timestamp',
      label: 'Date & Time',
      sortable: true,
      render: (val) => formatDate(val),
    },
    {
      key: 'referenceNumber',
      label: 'Transaction ID',
      sortable: true,
      render: (val) => <span style={{ fontFamily: 'monospace', fontWeight: '600' }}>{val}</span>,
    },
    {
      key: 'member',
      label: 'Member Name',
      sortable: true,
      render: (_, row) => row.member ? (
        <div>
          <span style={{ fontWeight: '600' }}>{row.member.name}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>ID: {row.member.employeeId}</span>
        </div>
      ) : <span style={{ color: 'var(--text-muted)' }}>System</span>,
    },
    {
      key: 'type',
      label: 'Transaction Type',
      sortable: true,
      render: (val) => (
        <span style={{ fontWeight: '700', color: getTypeColor(val) }}>
          {getTypeName(val)}
        </span>
      ),
    },
    {
      key: 'paymentMethod',
      label: 'Method',
      sortable: true,
      render: (val) => <span className="badge badge-neutral" style={{ fontSize: '11px' }}>{val}</span>,
    },
    {
      key: 'amount',
      label: 'Amount',
      sortable: true,
      render: (val, row) => (
        <span style={{ fontWeight: '700', color: row.type === 'WITHDRAWAL' ? 'var(--accent-danger)' : 'var(--accent-primary)' }}>
          {row.type === 'WITHDRAWAL' ? '-' : '+'}{formatCurrency(val)}
        </span>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div className="glass-card">
        {loading ? (
          <div className="skeleton" style={{ height: '300px', borderRadius: '16px' }} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <DataTable
              columns={columns}
              data={transactions}
              onRowClick={handleRowClick}
              searchable
              searchPlaceholder="Search by transaction reference or details..."
              emptyMessage="No transaction logs found."
            />
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-primary)' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                💡 Click any row to view or print the digital receipt.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Printable Receipt Modal */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        transaction={selectedTxn}
      />
    </div>
  );
}
