'use client';

import React, { useEffect, useState, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { UserProfile } from '@/context/WorkspaceContext';
import { Timeline, TimelineItem } from '@/components/Timeline';
import { StatusBadge } from '@/components/StatusBadge';
import { Modal } from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { formatCurrency, formatDate } from '@/lib/utils';

interface Witness {
  id: string;
  status: string;
  remarks: string | null;
  respondedAt: string | null;
  witness: {
    id: string;
    name: string;
    employeeId: string;
    rank: string | null;
  };
}

interface Repayment {
  id: string;
  amount: number;
  principalPortion: number;
  interestPortion: number;
  month: string;
  status: string;
  paidAt: string;
}

interface LoanDetails {
  id: string;
  applicantId: string;
  amount: number;
  purpose: string;
  category: string;
  tenureMonths: number;
  interestRate: number;
  status: string;
  rejectionReason: string | null;
  appliedAt: string;
  approvedAt: string | null;
  disbursedAt: string | null;
  applicant: {
    id: string;
    name: string;
    email: string;
    employeeId: string;
    rank: string | null;
  };
  witnesses: Witness[];
  repayments: Repayment[];
}

export default function LoanDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: loanId } = use(params);
  const [loan, setLoan] = useState<LoanDetails | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Rejection modal state
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  
  // Witness remarks state
  const [witnessRemarks, setWitnessRemarks] = useState('');
  const [witnessSubmitting, setWitnessSubmitting] = useState(false);

  const router = useRouter();
  const { showToast } = useToast();

  const fetchLoanDetails = useCallback(async () => {
    try {
      const res = await fetch(`/api/loans/${loanId}`);
      if (res.ok) {
        const data = await res.json();
        setLoan(data);
      } else {
        showToast('Loan details not found', 'error');
        router.push('/loans');
      }
    } catch {
      showToast('Failed to fetch details', 'error');
    }
  }, [loanId, showToast, router]);

  const fetchCurrentUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        setCurrentUser(await res.json());
      }
    } catch {
      console.error('Failed to fetch user context');
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchLoanDetails(), fetchCurrentUser()]);
      if (isMounted) {
        setLoading(false);
      }
    };
    init();
    return () => {
      isMounted = false;
    };
  }, [fetchLoanDetails, fetchCurrentUser]);

  const handleAction = async (action: 'approve' | 'reject' | 'disburse') => {
    if (action === 'reject' && !rejectReason.trim()) {
      showToast('Please provide a reason for rejection', 'warning');
      return;
    }

    try {
      const res = await fetch(`/api/loans/${loanId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          reason: rejectReason,
        }),
      });

      if (res.ok) {
        showToast(`Loan application ${action === 'reject' ? 'rejected' : action === 'approve' ? 'approved' : 'disbursed'} successfully`, 'success');
        setIsRejectModalOpen(false);
        setRejectReason('');
        fetchLoanDetails();
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to update loan state', 'error');
      }
    } catch {
      showToast('An error occurred. Please try again.', 'error');
    }
  };

  const handleWitnessSubmit = async (status: 'ACCEPTED' | 'DECLINED') => {
    setWitnessSubmitting(true);
    try {
      const res = await fetch(`/api/loans/${loanId}/witness`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          remarks: witnessRemarks || `${status === 'ACCEPTED' ? 'Approved' : 'Declined'} as witness`,
        }),
      });

      if (res.ok) {
        showToast(`Your witness co-signature has been logged as ${status.toLowerCase()}ed`, 'success');
        setWitnessRemarks('');
        fetchLoanDetails();
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to submit response', 'error');
      }
    } catch {
      showToast('An error occurred during submission', 'error');
    } finally {
      setWitnessSubmitting(false);
    }
  };

  if (loading) {
    return <div className="skeleton" style={{ height: '480px', borderRadius: '12px' }} />;
  }

  if (!loan) return <p>Loan record not found.</p>;

  // Build timeline items
  const timelineItems: TimelineItem[] = [
    {
      title: 'Loan Applied',
      description: `Applicant: ${loan.applicant.name} | Amount: ${formatCurrency(loan.amount)}`,
      date: formatDate(loan.appliedAt),
      status: 'completed'
    }
  ];

  // Witness step
  const activeWitnesses = loan.witnesses;
  const acceptedWitnesses = activeWitnesses.filter(w => w.status === 'ACCEPTED');
  const witnessStatus: TimelineItem['status'] = loan.status === 'PENDING_WITNESSES' 
    ? 'active' 
    : ['REJECTED', 'DECLINED'].includes(loan.status) && acceptedWitnesses.length === 0
      ? 'pending'
      : 'completed';

  timelineItems.push({
    title: 'Witness Clearance',
    description: `${acceptedWitnesses.length} of ${activeWitnesses.length} witnesses cleared this loan`,
    date: loan.witnesses.find(w => w.respondedAt)?.respondedAt ? formatDate(loan.witnesses.find(w => w.respondedAt)!.respondedAt!) : 'In progress',
    status: witnessStatus
  });

  // Approval step
  const approvalStatus: TimelineItem['status'] = loan.status === 'PENDING_APPROVAL'
    ? 'active'
    : ['APPROVED', 'DISBURSED', 'REPAYING', 'CLOSED'].includes(loan.status)
      ? 'completed'
      : 'pending';

  timelineItems.push({
    title: 'Administrative Approval',
    description: loan.approvedAt ? 'Approved by Admin Committee' : loan.status === 'REJECTED' ? `Rejected: ${loan.rejectionReason}` : 'Awaiting review',
    date: loan.approvedAt ? formatDate(loan.approvedAt) : '',
    status: loan.status === 'REJECTED' ? 'pending' : approvalStatus
  });

  // Disbursement step
  const disbursementStatus: TimelineItem['status'] = loan.status === 'APPROVED'
    ? 'active'
    : ['DISBURSED', 'REPAYING', 'CLOSED'].includes(loan.status)
      ? 'completed'
      : 'pending';

  timelineItems.push({
    title: 'Cooperative Disbursement',
    description: loan.disbursedAt ? 'Funds transferred to member account' : 'Awaiting transfer setup',
    date: loan.disbursedAt ? formatDate(loan.disbursedAt) : '',
    status: disbursementStatus
  });

  const isAdminOrTreasurer = currentUser?.role === 'ADMIN' || currentUser?.role === 'TREASURER';
  const isWitnessRequested = loan.witnesses.some(w => w.witness.id === currentUser?.id && w.status === 'REQUESTED');
  
  const totalPrincipalRepaid = loan.repayments
    .filter(r => r.status === 'CONFIRMED')
    .reduce((sum, r) => sum + r.principalPortion, 0);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '32px' }}>
      
      {/* Left Column: Loan Info */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        
        {/* Loan Header Card */}
        <div className="glass-card" style={{ padding: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Loan Category: {loan.category}
            </span>
            <h2 style={{ fontSize: '32px', fontWeight: '800', margin: '8px 0', color: 'var(--text-primary)' }}>
              {formatCurrency(loan.amount)}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                Borrower: <span style={{ fontWeight: '600' }}>{loan.applicant.name}</span> ({loan.applicant.employeeId})
              </span>
              <StatusBadge status={loan.status} />
            </div>
          </div>

          {/* Context Action Blocks */}
          {isAdminOrTreasurer && loan.status === 'PENDING_APPROVAL' && (
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => handleAction('approve')} className="btn btn-primary">Approve Application</button>
              <button onClick={() => setIsRejectModalOpen(true)} className="btn btn-danger">Reject</button>
            </div>
          )}

          {isAdminOrTreasurer && loan.status === 'APPROVED' && (
            <button onClick={() => handleAction('disburse')} className="btn btn-primary">
              Set Disbursed
            </button>
          )}
        </div>

        {/* Details and Terms */}
        <div className="glass-card" style={{ padding: '28px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '700' }}>Lending Terms & Purpose</h3>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '16px', margin: '0 0 24px 0' }}>
            {loan.purpose}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
            <div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Repayment Tenure</span>
              <p style={{ margin: '4px 0 0 0', fontSize: '16px', fontWeight: '700' }}>{loan.tenureMonths} Months</p>
            </div>
            <div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Interest Rate</span>
              <p style={{ margin: '4px 0 0 0', fontSize: '16px', fontWeight: '700', color: 'var(--accent-warning)' }}>
                {loan.interestRate > 0 ? `${loan.interestRate}% Flat Per Annum` : '0% (Interest-Free)'}
              </p>
            </div>
            <div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Outstanding Balance</span>
              <p style={{ margin: '4px 0 0 0', fontSize: '16px', fontWeight: '700' }}>
                {formatCurrency(Math.max(0, loan.amount - totalPrincipalRepaid))}
              </p>
            </div>
            <div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Repaid to Date</span>
              <p style={{ margin: '4px 0 0 0', fontSize: '16px', fontWeight: '700', color: 'var(--accent-primary)' }}>
                {formatCurrency(totalPrincipalRepaid)}
              </p>
            </div>
          </div>
        </div>

        {/* Repayment ledger if loan is active */}
        {loan.repayments.length > 0 && (
          <div className="glass-card" style={{ padding: '28px' }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '700' }}>Repayments Ledger</h3>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>EMI Amount</th>
                    <th>Principal</th>
                    <th>Interest</th>
                    <th>Date Paid</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loan.repayments.map(rep => (
                    <tr key={rep.id}>
                      <td>{rep.month}</td>
                      <td style={{ fontWeight: '600' }}>{formatCurrency(rep.amount)}</td>
                      <td>{formatCurrency(rep.principalPortion)}</td>
                      <td>{formatCurrency(rep.interestPortion)}</td>
                      <td>{formatDate(rep.paidAt)}</td>
                      <td><StatusBadge status={rep.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Right Column: Status Tracker & Witness Board */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        
        {/* Timeline Status */}
        <div className="glass-card" style={{ padding: '28px' }}>
          <h3 style={{ margin: '0 0 24px 0', fontSize: '18px', fontWeight: '700' }}>Application Timeline</h3>
          <Timeline items={timelineItems} />
        </div>

        {/* Witness panel */}
        <div className="glass-card" style={{ padding: '28px' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '700' }}>Witness Clearances</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {loan.witnesses.map(wit => (
              <div key={wit.id} style={{
                background: 'rgba(255,255,255,0.01)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '14px', fontWeight: '600', display: 'block' }}>{wit.witness.name}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ID: {wit.witness.employeeId}</span>
                  </div>
                  <StatusBadge status={wit.status} size="sm" />
                </div>
                {wit.remarks && (
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.1)', padding: '8px 12px', borderRadius: '4px' }}>
                    &quot;{wit.remarks}&quot;
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Witness Response Form */}
          {isWitnessRequested && (
            <div style={{
              marginTop: '24px',
              paddingTop: '20px',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--accent-warning)', textTransform: 'uppercase' }}>
                Your Co-signature Petition Awaited
              </span>
              <textarea
                className="textarea"
                placeholder="Provide witness remarks (optional)..."
                value={witnessRemarks}
                onChange={(e) => setWitnessRemarks(e.target.value)}
                style={{ minHeight: '80px', fontSize: '13px' }}
                disabled={witnessSubmitting}
              />
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  onClick={() => handleWitnessSubmit('ACCEPTED')} 
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '10px' }}
                  disabled={witnessSubmitting}
                >
                  Accept Request
                </button>
                <button 
                  onClick={() => handleWitnessSubmit('DECLINED')} 
                  className="btn btn-danger"
                  style={{ flex: 1, padding: '10px' }}
                  disabled={witnessSubmitting}
                >
                  Decline
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        title="Reject Loan Application"
        footer={(
          <>
            <button onClick={() => setIsRejectModalOpen(false)} className="btn btn-ghost">Cancel</button>
            <button onClick={() => handleAction('reject')} className="btn btn-danger">Confirm Reject</button>
          </>
        )}
      >
        <div className="form-group">
          <label className="form-label" htmlFor="reject-reason">Provide Rejection Reason</label>
          <textarea
            id="reject-reason"
            className="textarea"
            placeholder="State the policies/rules violated..."
            style={{ minHeight: '120px' }}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            required
          />
        </div>
      </Modal>
    </div>
  );
}
