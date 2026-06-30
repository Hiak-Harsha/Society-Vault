'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DataTable, Column } from '@/components/DataTable';
import { StatusBadge } from '@/components/StatusBadge';
import { useToast } from '@/components/Toast';
import { useWorkspace } from '@/context/WorkspaceContext';
import { formatCurrency, formatDate } from '@/lib/utils';

interface Loan {
  id: string;
  applicantId: string;
  amount: number;
  purpose: string;
  category: string;
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

interface WitnessRequest {
  id: string;
  loanId: string;
  witnessId: string;
  status: string;
  remarks: string | null;
  loan: {
    id: string;
    amount: number;
    purpose: string;
    category: string;
    appliedAt: string;
    applicant: {
      name: string;
      employeeId: string;
      rank: string | null;
    };
  };
}

interface WitnessLoan {
  id: string;
  amount: number;
  purpose: string;
  category: string;
  appliedAt: string;
  applicant: {
    name: string;
    employeeId: string;
    rank: string | null;
  };
  witnesses?: Array<{
    id: string;
    witnessId: string;
    status: string;
    remarks: string | null;
  }>;
}

export default function LoansPage() {
  const { loans: cachedLoans, fetchLoans, currentUser } = useWorkspace();
  const [witnessRequests, setWitnessRequests] = useState<WitnessRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'my' | 'witness' | 'all'>('my');
  const [loading, setLoading] = useState(!cachedLoans || cachedLoans.length === 0);
  
  const router = useRouter();
  const { showToast } = useToast();

  // Filter cached loans using useMemo to prevent unnecessary setState calls and cascading renders
  const displayedLoans = useMemo(() => {
    if (!currentUser) return [];
    const typedCachedLoans = cachedLoans as unknown as Loan[];
    if (activeTab === 'all') {
      return typedCachedLoans;
    } else if (activeTab === 'my') {
      return typedCachedLoans.filter((l) => l.applicantId === currentUser.id);
    }
    return [];
  }, [cachedLoans, activeTab, currentUser]);

  const loadData = useCallback(async () => {
    if (!currentUser) return;
    
    // Only show loader if we have no cached data yet
    if (!cachedLoans || cachedLoans.length === 0) {
      setLoading(true);
    }
    
    try {
      // Background refresh of the full loans list
      await fetchLoans();
      
      // If we are on witness tab, fetch pending witness requests
      if (activeTab === 'witness') {
        const res = await fetch(`/api/loans?witnessId=${currentUser.id}&status=PENDING_WITNESSES`);
         if (res.ok) {
          const witnessLoans: WitnessLoan[] = await res.json();
          const requests: WitnessRequest[] = witnessLoans
            .filter((l) => {
              const myWitnessEntry = l.witnesses?.find((w) => w.witnessId === currentUser.id);
              return myWitnessEntry?.status === 'REQUESTED';
            })
            .map((l) => ({
              id: l.id,
              loanId: l.id,
              witnessId: currentUser.id,
              status: 'REQUESTED',
              remarks: null,
              loan: l,
            }));
          setWitnessRequests(requests);
        }
      }
    } catch (e) {
      console.error('Failed to load loans data:', e);
    } finally {
      setLoading(false);
    }
  }, [currentUser, activeTab, cachedLoans, fetchLoans]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadData]);

  const handleRowClick = (row: Loan) => {
    router.push(`/loans/${row.id}`);
  };

  const handleWitnessResponse = async (loanId: string, action: 'ACCEPTED' | 'DECLINED') => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/loans/${loanId}/witness`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: action,
          remarks: `${action === 'ACCEPTED' ? 'Approved' : 'Declined'} as witness by ${currentUser.name}`,
        }),
      });

      if (res.ok) {
        showToast(`Witness request ${action.toLowerCase()}ed successfully`, 'success');
        // Refresh witness requests
        setWitnessRequests(prev => prev.filter(r => r.loanId !== loanId));
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to submit response', 'error');
      }
    } catch {
      showToast('An error occurred. Please try again.', 'error');
    }
  };

  const myLoansColumns: Column<Loan>[] = [
    {
      key: 'appliedAt',
      label: 'Applied Date',
      sortable: true,
      render: (val) => formatDate(val),
    },
    {
      key: 'amount',
      label: 'Amount',
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
      label: 'Purpose',
      sortable: false,
      render: (val) => <span style={{ color: 'var(--text-secondary)' }}>{val.length > 50 ? `${val.substring(0, 50)}...` : val}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (val) => <StatusBadge status={val} />,
    },
  ];

  const allLoansColumns: Column<Loan>[] = [
    {
      key: 'applicant',
      label: 'Borrower',
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
      label: 'Amount',
      sortable: true,
      render: (val) => formatCurrency(val),
    },
    {
      key: 'category',
      label: 'Category',
      sortable: true,
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (val) => <StatusBadge status={val} />,
    },
  ];

  const witnessColumns: Column<WitnessRequest>[] = [
    {
      key: 'applicant',
      label: 'Applicant',
      sortable: true,
      render: (_, row) => (
        <div>
          <span style={{ fontWeight: '600' }}>{row.loan.applicant.name}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>ID: {row.loan.applicant.employeeId}</span>
        </div>
      ),
    },
    {
      key: 'amount',
      label: 'Loan Amount',
      sortable: true,
      render: (_, row) => formatCurrency(row.loan.amount),
    },
    {
      key: 'purpose',
      label: 'Purpose',
      sortable: false,
      render: (_, row) => <span style={{ color: 'var(--text-secondary)' }}>{row.loan.purpose}</span>,
    },
    {
      key: 'actions',
      label: 'Witness Action',
      sortable: false,
      render: (_, row) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={(e) => { e.stopPropagation(); handleWitnessResponse(row.loanId, 'ACCEPTED'); }}
            className="btn btn-primary btn-sm"
          >
            Accept
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); handleWitnessResponse(row.loanId, 'DECLINED'); }}
            className="btn btn-danger btn-sm"
          >
            Decline
          </button>
        </div>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '4px' }}>
        <div className="tabs" style={{ display: 'flex', gap: '12px', marginBottom: 0 }}>
          <button 
            onClick={() => setActiveTab('my')} 
            className={`tab ${activeTab === 'my' ? 'active' : ''}`}
          >
            My Loan Accounts
          </button>
          <button 
            onClick={() => setActiveTab('witness')} 
            className={`tab ${activeTab === 'witness' ? 'active' : ''}`}
          >
            Witness Requests ({witnessRequests.length})
          </button>
          <button 
            onClick={() => setActiveTab('all')} 
            className={`tab ${activeTab === 'all' ? 'active' : ''}`}
          >
            All Society Loans (Transparency)
          </button>
        </div>

        <Link href="/loans/apply" className="btn btn-primary">
          Apply for Loan
        </Link>
      </div>

      <div className="glass-card">
        {loading ? (
          <div className="skeleton" style={{ height: '300px', borderRadius: '16px' }} />
        ) : (
          activeTab === 'my' ? (
            <DataTable
              columns={myLoansColumns}
              data={displayedLoans}
              onRowClick={handleRowClick}
              emptyMessage="You have not applied for any loans."
            />
          ) : activeTab === 'witness' ? (
            <DataTable
              columns={witnessColumns}
              data={witnessRequests}
              onRowClick={(row) => router.push(`/loans/${row.loanId}`)}
              emptyMessage="No pending witness request petitions."
            />
          ) : (
            <DataTable
              columns={allLoansColumns}
              data={displayedLoans}
              onRowClick={handleRowClick}
              emptyMessage="No loans registered in the society pool."
              searchable
              searchPlaceholder="Search by borrower name or ID..."
            />
          )
        )}
      </div>
    </div>
  );
}
