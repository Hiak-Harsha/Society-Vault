'use client';

import React, { useEffect } from 'react';
import { StatCard } from '@/components/StatCard';
import { useWorkspace } from '@/context/WorkspaceContext';
import { formatCurrency, formatDateTime } from '@/lib/utils';

interface DashboardData {
  personal: {
    totalContributed: number;
    activeLoansCount: number;
    activeLoanOutstanding: number;
    pendingWitnessRequests: number;
  };
  fundSummary: {
    totalPool: number;
    totalDisbursed: number;
    totalRepaid: number;
    availableBalance: number;
    activeLoans: number;
    totalMembers: number;
  };
  membersByGrade: {
    gradeName: string;
    count: number;
  }[];
  recentActivity: {
    id: string;
    action: string;
    entityType: string;
    timestamp: string;
    actor: {
      name: string;
      employeeId: string;
    } | null;
  }[];
}

export default function DashboardPage() {
  const { dashboardData, fetchDashboard } = useWorkspace();

  useEffect(() => {
    // Background silent refresh
    fetchDashboard();
  }, [fetchDashboard]);

  if (!dashboardData) {
    return (
      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {/* Upper metrics row skeleton */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="glass-card skeleton" style={{ height: '140px', borderRadius: '16px' }} />
          ))}
        </div>
        
        {/* Middle Grid skeleton */}
        <div className="responsive-grid-split" style={{ gap: '32px' }}>
          <div className="glass-card skeleton" style={{ height: '320px', borderRadius: '16px' }} />
          <div className="glass-card skeleton" style={{ height: '320px', borderRadius: '16px' }} />
        </div>

        {/* Activity feed skeleton */}
        <div className="glass-card skeleton" style={{ height: '240px', borderRadius: '16px' }} />
      </div>
    );
  }

  const data = dashboardData as unknown as DashboardData;

  const formatActivityAction = (action: string) => {
    return action.replace('_', ' ');
  };

  const getActivityColor = (action: string) => {
    if (['LOAN_APPLY', 'CONTRIBUTION'].includes(action)) return 'var(--accent-secondary)';
    if (['LOAN_APPROVE', 'REPAYMENT'].includes(action)) return 'var(--accent-primary)';
    if (['LOAN_REJECT', 'MEMBER_DEACTIVATE'].includes(action)) return 'var(--accent-danger)';
    return 'var(--text-muted)';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Upper metrics row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
        <StatCard
          className="stagger-1"
          title="My Total Contributions"
          value={formatCurrency(data.personal.totalContributed)}
          icon={(
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          )}
          color="var(--accent-primary)"
          subtitle="Regular monthly savings accumulated"
        />

        <StatCard
          className="stagger-2"
          title="Active Outstanding Loan"
          value={formatCurrency(data.personal.activeLoanOutstanding)}
          icon={(
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="6" width="20" height="12" rx="2" />
              <circle cx="12" cy="12" r="2" />
              <path d="M6 12h.01M18 12h.01" />
            </svg>
          )}
          color={data.personal.activeLoanOutstanding > 0 ? 'var(--accent-warning)' : 'var(--text-muted)'}
          subtitle={`${data.personal.activeLoansCount} active borrowing account(s)`}
        />

        <StatCard
          className="stagger-3"
          title="Witness Requests"
          value={data.personal.pendingWitnessRequests}
          icon={(
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          )}
          color={data.personal.pendingWitnessRequests > 0 ? 'var(--accent-secondary)' : 'var(--text-muted)'}
          subtitle="Awaiting your co-signature approval"
        />

        <StatCard
          className="stagger-4"
          title="Available Fund Pool"
          value={formatCurrency(data.fundSummary.availableBalance)}
          icon={(
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              <circle cx="12" cy="16" r="1"/>
            </svg>
          )}
          color="var(--accent-info)"
          subtitle={`Total society pool: ${formatCurrency(data.fundSummary.totalPool)}`}
        />
      </div>

      {/* Middle Grid */}
      <div className="responsive-grid-split" style={{ gap: '32px' }}>
        
        {/* Left: Fund Progress */}
        <div className="glass-card" style={{ padding: '28px' }}>
          <h3 style={{ margin: '0 0 24px 0', fontSize: '18px', fontWeight: '700' }}>Cooperative Fund Allocation</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Available Reserves</span>
                <span style={{ fontWeight: '600' }}>
                  {Math.round((data.fundSummary.availableBalance / (data.fundSummary.totalPool || 1)) * 100)}%
                </span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{
                  width: `${(data.fundSummary.availableBalance / (data.fundSummary.totalPool || 1)) * 100}%`,
                  background: 'linear-gradient(90deg, #10b981, #059669)'
                }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Outflow in Active Loans</span>
                <span style={{ fontWeight: '600' }}>
                  {Math.round(((data.fundSummary.totalDisbursed - data.fundSummary.totalRepaid) / (data.fundSummary.totalPool || 1)) * 100)}%
                </span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{
                  width: `${((data.fundSummary.totalDisbursed - data.fundSummary.totalRepaid) / (data.fundSummary.totalPool || 1)) * 100}%`,
                  background: 'linear-gradient(90deg, #6366f1, #4f46e5)'
                }} />
              </div>
            </div>
          </div>

          <div className="responsive-grid-3col" style={{
            gap: '16px',
            marginTop: '32px',
            paddingTop: '24px',
            borderTop: '1px solid var(--border-primary)'
          }}>
            <div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Accumulated Pool</span>
              <p style={{ margin: '4px 0 0 0', fontSize: '18px', fontWeight: '700' }}>{formatCurrency(data.fundSummary.totalPool)}</p>
            </div>
            <div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total Repaid</span>
              <p style={{ margin: '4px 0 0 0', fontSize: '18px', fontWeight: '700', color: 'var(--accent-primary)' }}>{formatCurrency(data.fundSummary.totalRepaid)}</p>
            </div>
            <div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Members Enrolled</span>
              <p style={{ margin: '4px 0 0 0', fontSize: '18px', fontWeight: '700' }}>{data.fundSummary.totalMembers}</p>
            </div>
          </div>
        </div>

        {/* Right: Members by Grade */}
        <div className="glass-card" style={{ padding: '28px' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '700' }}>Membership Tier Tally</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {data.membersByGrade.map((grade) => (
              <div key={grade.gradeName} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.01)',
                border: '1px solid var(--border-primary)'
              }}>
                <span style={{ fontSize: '14px', fontWeight: '500' }}>{grade.gradeName}</span>
                <span className="badge badge-neutral" style={{ fontSize: '12px', fontWeight: '700' }}>{grade.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Activity Log */}
      <div className="glass-card" style={{ padding: '28px' }}>
        <h3 style={{ margin: '0 0 24px 0', fontSize: '18px', fontWeight: '700' }}>Recent Society Activity</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {data.recentActivity.length > 0 ? (
            data.recentActivity.map((activity) => (
              <div key={activity.id} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '16px',
                borderBottom: '1px solid var(--border-primary)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: getActivityColor(activity.action)
                  }} />
                  <div>
                    <span style={{ fontSize: '14px', fontWeight: '600' }}>
                      {formatActivityAction(activity.action)}
                    </span>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)', marginLeft: '12px' }}>
                      by {activity.actor?.name || 'Platform'} ({activity.actor?.employeeId || 'System'})
                    </span>
                  </div>
                </div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {formatDateTime(activity.timestamp)}
                </span>
              </div>
            ))
          ) : (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No activities logged yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
