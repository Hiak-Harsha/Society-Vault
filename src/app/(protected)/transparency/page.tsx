'use client';

import React, { useEffect, useState } from 'react';
import { DataTable, Column } from '@/components/DataTable';
import { StatusBadge } from '@/components/StatusBadge';
import { formatCurrency, formatDate } from '@/lib/utils';

interface ContributionLedger {
  id: string;
  amount: number;
  month: string;
  status: string;
  paidAt: string;
  member: {
    name: string;
    employeeId: string;
  };
}

interface LoanLedger {
  id: string;
  amount: number;
  category: string;
  purpose: string;
  status: string;
  appliedAt: string;
  applicant: {
    name: string;
    employeeId: string;
  };
  _count: {
    witnesses: number;
  };
}

interface FundSummary {
  totalPool: number;
  totalDisbursed: number;
  totalRepaid: number;
  availableBalance: number;
  activeLoans: number;
}

export default function TransparencyPage() {
  const [summary, setSummary] = useState<FundSummary | null>(null);
  const [loans, setLoans] = useState<LoanLedger[]>([]);
  const [contributions, setContributions] = useState<ContributionLedger[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [ledgerTab, setLedgerTab] = useState<'loans' | 'contributions'>('loans');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [sumRes, loansRes, contribsRes] = await Promise.all([
          fetch('/api/org/fund-summary'),
          fetch('/api/loans?all=true'),
          fetch('/api/contributions?all=true'),
        ]);

        if (sumRes.ok) setSummary(await sumRes.json());
        if (loansRes.ok) setLoans(await loansRes.json());
        if (contribsRes.ok) setContributions(await contribsRes.json());
      } catch (error) {
        console.error('Fetch transparency data error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div className="skeleton" style={{ height: '480px', borderRadius: '12px' }} />;
  }

  const loansColumns: Column<LoanLedger>[] = [
    {
      key: 'applicant',
      label: 'Borrower Name',
      sortable: true,
      render: (_, row) => (
        <div>
          <span style={{ fontWeight: '600' }}>{row.applicant.name}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>ID: {row.applicant.employeeId}</span>
        </div>
      ),
    },
    {
      key: 'appliedAt',
      label: 'Applied Date',
      sortable: true,
      render: (val) => formatDate(val),
    },
    {
      key: 'amount',
      label: 'Loan Amount',
      sortable: true,
      render: (val) => formatCurrency(val),
    },
    {
      key: 'category',
      label: 'Category',
      sortable: true,
    },
    {
      key: 'purpose',
      label: 'Purpose Details',
      sortable: false,
      render: (val) => <span style={{ color: 'var(--text-secondary)' }}>{val.length > 60 ? `${val.substring(0, 60)}...` : val}</span>,
    },
    {
      key: 'witnesses',
      label: 'Guarantor Signatures',
      sortable: false,
      render: (_, row) => (
        <span className="badge badge-neutral" style={{ fontSize: '11px' }}>
          {row._count?.witnesses || 0} Witnesses
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Lending Status',
      sortable: true,
      render: (val) => <StatusBadge status={val} />,
    },
  ];

  const contribsColumns: Column<ContributionLedger>[] = [
    { key: 'month', label: 'Month', sortable: true },
    {
      key: 'member',
      label: 'Employee Name',
      sortable: true,
      render: (_, row) => (
        <div>
          <span style={{ fontWeight: '600' }}>{row.member.name}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>ID: {row.member.employeeId}</span>
        </div>
      ),
    },
    {
      key: 'amount',
      label: 'Amount Paid',
      sortable: true,
      render: (val) => formatCurrency(val),
    },
    {
      key: 'paidAt',
      label: 'Date Deposited',
      sortable: true,
      render: (val) => formatDate(val),
    },
    {
      key: 'status',
      label: 'Deposit Status',
      sortable: true,
      render: (val) => <StatusBadge status={val} />,
    },
  ];

  const totalPool = summary?.totalPool || 0;
  const available = summary?.availableBalance || 0;
  const outstanding = (summary?.totalDisbursed || 0) - (summary?.totalRepaid || 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Overview stats cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px' }}>
        <div className="glass-card" style={{ padding: '24px', position: 'relative' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Total Cooperative Pool</span>
          <p style={{ margin: '8px 0 0 0', fontSize: '24px', fontWeight: '800' }}>{formatCurrency(totalPool)}</p>
        </div>
        <div className="glass-card" style={{ padding: '24px', position: 'relative' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="status-dot active" /> Available Reserves
          </span>
          <p style={{ margin: '8px 0 0 0', fontSize: '24px', fontWeight: '800', color: 'var(--accent-primary)' }}>{formatCurrency(available)}</p>
        </div>
        <div className="glass-card" style={{ padding: '24px', position: 'relative' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Active Borrowing Outflow</span>
          <p style={{ margin: '8px 0 0 0', fontSize: '24px', fontWeight: '800', color: 'var(--accent-warning)' }}>{formatCurrency(outstanding)}</p>
        </div>
        <div className="glass-card" style={{ padding: '24px', position: 'relative' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Active Loan Tally</span>
          <p style={{ margin: '8px 0 0 0', fontSize: '24px', fontWeight: '800' }}>{summary?.activeLoans || 0} Loan Accounts</p>
        </div>
      </div>

      {/* Visual Chart Card */}
      <div className="glass-card" style={{ padding: '28px' }}>
        <h3 style={{ margin: '0 0 24px 0', fontSize: '18px', fontWeight: '700' }}>Fund Reserve Allocation Ratio</h3>
        
        <div style={{ display: 'flex', gap: '8px', height: '32px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', overflow: 'hidden', padding: '4px' }}>
          <div style={{
            width: `${(available / (totalPool || 1)) * 100}%`,
            background: 'linear-gradient(90deg, #10b981, #059669)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px',
            fontWeight: '700',
            color: '#0a0e1a',
            transition: 'width 0.3s'
          }}>
            {available > 0 && 'Reserves'}
          </div>
          <div style={{
            width: `${(outstanding / (totalPool || 1)) * 100}%`,
            background: 'linear-gradient(90deg, #6366f1, #4f46e5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px',
            fontWeight: '700',
            color: '#ffffff',
            transition: 'width 0.3s'
          }}>
            {outstanding > 0 && 'Borrowed'}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '24px', marginTop: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--accent-primary)', display: 'inline-block' }} />
            <span style={{ color: 'var(--text-secondary)' }}>Available Reserves: {formatCurrency(available)} ({Math.round((available / (totalPool || 1)) * 100)}%)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--accent-secondary)', display: 'inline-block' }} />
            <span style={{ color: 'var(--text-secondary)' }}>Outflow in Active Loans: {formatCurrency(outstanding)} ({Math.round((outstanding / (totalPool || 1)) * 100)}%)</span>
          </div>
        </div>
      </div>

      {/* Ledger Tables */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div className="tabs" style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
          <button 
            onClick={() => setLedgerTab('loans')} 
            className={`tab ${ledgerTab === 'loans' ? 'active' : ''}`}
            style={{ fontSize: '16px', fontWeight: '600' }}
          >
            Loan ledger
          </button>
          <button 
            onClick={() => setLedgerTab('contributions')} 
            className={`tab ${ledgerTab === 'contributions' ? 'active' : ''}`}
            style={{ fontSize: '16px', fontWeight: '600' }}
          >
            Contributions Ledger
          </button>
        </div>

        <div className="glass-card">
          {ledgerTab === 'loans' ? (
            <DataTable
              columns={loansColumns}
              data={loans}
              searchable
              searchPlaceholder="Filter loans ledger by borrower name or ID..."
              emptyMessage="No loan ledger records logged."
            />
          ) : (
            <DataTable
              columns={contribsColumns}
              data={contributions}
              searchable
              searchPlaceholder="Filter contributions ledger by employee..."
              emptyMessage="No contribution ledger records logged."
            />
          )}
        </div>
      </div>
    </div>
  );
}
