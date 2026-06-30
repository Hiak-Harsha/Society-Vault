'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/Toast';
import { ContributionRecord, LoanRecord, RepaymentRecord } from '@/context/WorkspaceContext';

interface ReportStats {
  collectionRate: number;
  totalCollectedThisMonth: number;
  expectedThisMonth: number;
  totalOutstandingLending: number;
  repaymentRate: number;
  activeBorrowersCount: number;
  nonRepayingCount: number;
}

const getDefaultMonth = () => {
  const now = new Date();
  const year = now.getFullYear();
  const monthStr = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${monthStr}`;
};

export default function ReportsAdminPage() {
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(getDefaultMonth());

  const { showToast } = useToast();

  const fetchReportData = useCallback(async (month: string) => {
    setLoading(true);
    try {
      // Fetch stats and calculate report aggregations directly
      const [contribsRes, loansRes, repaymentsRes, fundRes] = await Promise.all([
        fetch('/api/contributions?all=true'),
        fetch('/api/loans?all=true'),
        fetch('/api/repayments?all=true'),
        fetch('/api/org/fund-summary'),
      ]);

      if (contribsRes.ok && loansRes.ok && repaymentsRes.ok && fundRes.ok) {
        const contribs: ContributionRecord[] = await contribsRes.json();
        const loans: LoanRecord[] = await loansRes.json();
        const repayments: RepaymentRecord[] = await repaymentsRes.json();
        const fund = await fundRes.json();

        // 1. Calculate Monthly Collection Rate (contributions)
        // Expected contributions = total active members * monthly amount from their pay grade
        // For simplicity, let's look at confirmed vs pending contributions for the selected month
        const monthContribs = contribs.filter((c) => c.month === month);
        const confirmedContribs = monthContribs.filter((c) => c.status === 'CONFIRMED');
        
        const totalCollectedThisMonth = confirmedContribs.reduce((sum: number, c) => sum + c.amount, 0);
        const pendingCollectedThisMonth = monthContribs.filter((c) => c.status === 'PENDING').reduce((sum: number, c) => sum + c.amount, 0);
        const expectedThisMonth = totalCollectedThisMonth + pendingCollectedThisMonth || 5000; // Fallback default expected

        const collectionRate = expectedThisMonth > 0 ? Math.round((totalCollectedThisMonth / expectedThisMonth) * 100) : 100;

        // 2. Active Lending
        const totalOutstandingLending = fund.totalDisbursed - fund.totalRepaid;

        // 3. Monthly Repayment EMI Collection Rates
        const monthRepayments = repayments.filter((r) => r.month === month);
        const confirmedRepayments = monthRepayments.filter((r) => r.status === 'CONFIRMED');

        const totalRepaidThisMonth = confirmedRepayments.reduce((sum: number, r) => sum + r.amount, 0);
        const pendingRepaidThisMonth = monthRepayments.filter((r) => r.status === 'PENDING').reduce((sum: number, r) => sum + r.amount, 0);
        const expectedRepaidThisMonth = totalRepaidThisMonth + pendingRepaidThisMonth || 4375; // Fallback default expected

        const repaymentRate = expectedRepaidThisMonth > 0 ? Math.round((totalRepaidThisMonth / expectedRepaidThisMonth) * 100) : 100;

        const activeBorrowersCount = loans.filter((l) => l.status === 'REPAYING').length;
        const nonRepayingCount = loans.filter((l) => l.status === 'REPAYING' && !repayments.some((r) => r.loanId === l.id && r.month === month && r.status === 'CONFIRMED')).length;

        setStats({
          collectionRate,
          totalCollectedThisMonth,
          expectedThisMonth,
          totalOutstandingLending,
          repaymentRate,
          activeBorrowersCount,
          nonRepayingCount,
        });
      }
    } catch {
      showToast('Failed to generate monthly reports', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchReportData(selectedMonth);
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchReportData, selectedMonth]);

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedMonth(e.target.value);
  };

  const handleExportCSV = () => {
    if (!stats) return;

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Report Month,Metric,Value\n';
    csvContent += `"${selectedMonth}","Contribution Collection Rate","${stats.collectionRate}%"\n`;
    csvContent += `"${selectedMonth}","Total Collected Savings","${stats.totalCollectedThisMonth}"\n`;
    csvContent += `"${selectedMonth}","Expected Savings Pool","${stats.expectedThisMonth}"\n`;
    csvContent += `"${selectedMonth}","Active Outstanding Lending Portfolio","${stats.totalOutstandingLending}"\n`;
    csvContent += `"${selectedMonth}","Lending Repayment EMI Rate","${stats.repaymentRate}%"\n`;
    csvContent += `"${selectedMonth}","Active Borrower Accounts","${stats.activeBorrowersCount}"\n`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `financial_report_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Report data exported successfully', 'success');
  };

  if (loading) {
    return <div className="skeleton" style={{ height: '400px', borderRadius: '12px' }} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Month Picker Row */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '4px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <input
            type="month"
            className="input"
            value={selectedMonth}
            onChange={handleMonthChange}
            style={{ width: '180px' }}
          />

          <button 
            onClick={handleExportCSV} 
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            disabled={!stats}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export Report
          </button>
        </div>
      </div>

      {stats ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '28px' }}>
          
          {/* Card 1: Contributions Collection Report */}
          <div className="glass-card" style={{ padding: '28px' }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Savings Collection Report
            </h3>
            
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '16px' }}>
              <span className="text-gradient" style={{ fontSize: '36px', fontWeight: '800' }}>{stats.collectionRate}%</span>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Collection Success Rate</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Total Savings Collected:</span>
                <span style={{ fontWeight: '600', color: 'var(--accent-primary)' }}>{formatCurrency(stats.totalCollectedThisMonth)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Expected Savings Inflow:</span>
                <span style={{ fontWeight: '600' }}>{formatCurrency(stats.expectedThisMonth)}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Loan Repayments Report */}
          <div className="glass-card" style={{ padding: '28px' }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Lending Repayments (EMI)
            </h3>
            
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '16px' }}>
              <span className="text-gradient" style={{ fontSize: '36px', fontWeight: '800' }}>{stats.repaymentRate}%</span>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>EMI Collection Rate</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Active Borrowing Accounts:</span>
                <span style={{ fontWeight: '600' }}>{stats.activeBorrowersCount} Accounts</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Pending Repayments (this month):</span>
                <span style={{ fontWeight: '600', color: 'var(--accent-warning)' }}>{stats.nonRepayingCount} Accounts</span>
              </div>
            </div>
          </div>

          {/* Card 3: Portfolio Aggregates */}
          <div className="glass-card" style={{ padding: '28px' }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Portfolio Balances
            </h3>
            
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '16px' }}>
              <span className="text-gradient" style={{ fontSize: '32px', fontWeight: '800' }}>
                {formatCurrency(stats.totalOutstandingLending)}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
              <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                Total outstanding lending assets actively distributed among member loans. Repayment rate represents how many accounts settled their EMIs successfully this month.
              </p>
            </div>
          </div>

        </div>
      ) : (
        <p>No report stats available for selected month.</p>
      )}
    </div>
  );
}
