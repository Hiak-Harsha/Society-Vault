'use client';

import React, { useEffect, useState } from 'react';
import { DataTable, Column } from '@/components/DataTable';
import { StatusBadge } from '@/components/StatusBadge';
import { Modal } from '@/components/Modal';
import { PaymentModal } from '@/components/PaymentModal';
import { useToast } from '@/components/Toast';
import { useWorkspace } from '@/context/WorkspaceContext';
import { formatCurrency, formatDate } from '@/lib/utils';

interface Contribution {
  id: string;
  memberId: string;
  amount: number;
  month: string;
  status: string;
  paidAt: string;
  confirmedAt: string | null;
  confirmedBy: string | null;
  member: {
    name: string;
    employeeId: string;
    rank: string | null;
  };
}

interface MemberOption {
  id: string;
  name: string;
  employeeId: string;
  payGrade: {
    monthlyContribution: number;
  } | null;
}

export default function ContributionsPage() {
  const { contributions: rawContributions, fetchContributions, members: cachedMembers, fetchMembers, currentUser } = useWorkspace();
  const contributions = rawContributions as unknown as Contribution[];
  const members = cachedMembers as unknown as MemberOption[];
  
  const [loading, setLoading] = useState(!contributions || contributions.length === 0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { showToast } = useToast();

  // Form states
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [amount, setAmount] = useState('');
  const [month, setMonth] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const monthStr = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${monthStr}`;
  });

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      // Async revalidation in the background
      await Promise.all([fetchContributions(), fetchMembers()]);
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
  }, [fetchContributions, fetchMembers]);

  const handleMemberChange = (memberId: string) => {
    setSelectedMemberId(memberId);
    const member = members.find(m => m.id === memberId);
    if (member && member.payGrade) {
      setAmount(String(member.payGrade.monthlyContribution));
    } else {
      setAmount('');
    }
  };

  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberId || !amount || !month) return;
    
    // Close the input modal and open payment gateway modal
    setIsModalOpen(false);
    setIsPaymentOpen(true);
  };

  const handlePaymentSuccess = async (details: { paymentMethod: string; referenceNumber: string; razorpayOrderId?: string; razorpaySignature?: string }) => {
    try {
      const res = await fetch('/api/contributions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: selectedMemberId,
          amount: parseFloat(amount),
          month,
          paymentMethod: details.paymentMethod,
          referenceNumber: details.referenceNumber,
          razorpayOrderId: details.razorpayOrderId,
          razorpaySignature: details.razorpaySignature,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || 'Failed to record contribution', 'error');
      } else {
        showToast('Contribution payment successful! Deposit logged.', 'success');
        // Reset form
        setSelectedMemberId('');
        setAmount('');
        setMonth('');
        fetchContributions();
      }
    } catch {
      showToast('An error occurred during payment verification.', 'error');
    }
  };

  const handleProcess = async (id: string, action: 'confirm' | 'reject') => {
    try {
      const res = await fetch(`/api/contributions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (res.ok) {
        showToast(`Contribution ${action}ed successfully`, 'success');
        fetchContributions();
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to process contribution', 'error');
      }
    } catch {
      showToast('An error occurred during processing', 'error');
    }
  };

  const isAdminOrTreasurer = currentUser?.role === 'ADMIN' || currentUser?.role === 'TREASURER';

  const columns: Column<Contribution>[] = [
    { key: 'month', label: 'Month', sortable: true },
    {
      key: 'member',
      label: 'Employee Name',
      sortable: true,
      render: (_, row) => (
        <div>
          <span style={{ fontWeight: '600' }}>{row.member.name}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>
            ID: {row.member.employeeId} {row.member.rank ? `| ${row.member.rank}` : ''}
          </span>
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
      label: 'Date Logged',
      sortable: true,
      render: (val) => formatDate(val),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (val) => <StatusBadge status={val} />,
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (_, row) => {
        if (row.status === 'PENDING' && isAdminOrTreasurer) {
          return (
            <div style={{ display: 'flex', gap: '6px' }}>
              <button 
                onClick={() => handleProcess(row.id, 'confirm')}
                className="btn btn-primary btn-sm"
              >
                Approve
              </button>
              <button 
                onClick={() => handleProcess(row.id, 'reject')}
                className="btn btn-danger btn-sm"
              >
                Reject
              </button>
            </div>
          );
        }
        return <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>—</span>;
      },
    },
  ];

  // Month state defaults automatically to current month when initialized
  // So we do not need a useEffect trigger to set it.

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {isAdminOrTreasurer && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '4px' }}>
          <button onClick={() => {
            const now = new Date();
            const year = now.getFullYear();
            const monthStr = String(now.getMonth() + 1).padStart(2, '0');
            setMonth(`${year}-${monthStr}`);
            setIsModalOpen(true);
          }} className="btn btn-primary">
            Record Contribution
          </button>
        </div>
      )}

      <div className="glass-card">
        {loading ? (
          <div className="skeleton" style={{ height: '300px', borderRadius: '16px' }} />
        ) : (
          <DataTable
            columns={columns}
            data={contributions}
            searchable
            searchPlaceholder="Search by member name or ID..."
            emptyMessage="No contribution records found."
          />
        )}
      </div>

      {/* Record Contribution Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Record Contribution"
        footer={(
          <>
            <button onClick={() => setIsModalOpen(false)} className="btn btn-ghost">Cancel</button>
            <button type="submit" form="contrib-form" className="btn btn-primary">Save Contribution</button>
          </>
        )}
      >
        <form id="contrib-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="member-select">Cooperative Member</label>
            <select
              id="member-select"
              className="select"
              value={selectedMemberId}
              onChange={(e) => handleMemberChange(e.target.value)}
              required
            >
              <option value="">Select Member...</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.name} ({m.employeeId})</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="contrib-amount">Amount (₹)</label>
              <input
                id="contrib-amount"
                type="number"
                className="input"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                placeholder="Enter deposit amount"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="contrib-month">Contribution Month</label>
              <input
                id="contrib-month"
                type="month"
                className="input"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                required
              />
            </div>
          </div>
        </form>
      </Modal>

      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        amount={parseFloat(amount) || 0}
        purpose={`Savings Deposit Contribution for Month: ${month}`}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </div>
  );
}
