'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { DataTable, Column } from '@/components/DataTable';
import { StatusBadge } from '@/components/StatusBadge';
import { Modal } from '@/components/Modal';
import { PaymentModal } from '@/components/PaymentModal';
import { useToast } from '@/components/Toast';
import { useWorkspace } from '@/context/WorkspaceContext';
import { formatCurrency, formatDate } from '@/lib/utils';

interface Repayment {
  id: string;
  loanId: string;
  amount: number;
  principalPortion: number;
  interestPortion: number;
  month: string;
  status: string;
  paidAt: string;
  confirmedAt: string | null;
  confirmedBy: string | null;
  loan: {
    amount: number;
    category: string;
    applicant: {
      name: string;
      employeeId: string;
    };
  };
}

interface ActiveLoanOption {
  id: string;
  applicantId: string;
  amount: number;
  status: string;
  applicant: {
    id: string;
    name: string;
    employeeId: string;
    hasBankAccount: boolean;
    autoDeductEnabled: boolean;
  };
}

interface BankAccountInfo {
  hasBankAccount: boolean;
  maskedAccount: string | null;
  autoDeductEnabled: boolean;
}

export default function RepaymentsPage() {
  const { repayments: rawRepayments, fetchRepayments, loans: cachedLoans, fetchLoans, currentUser } = useWorkspace();
  const repayments = rawRepayments as unknown as Repayment[];
  const activeLoans = React.useMemo(() => {
    return ((cachedLoans || []) as unknown as ActiveLoanOption[]).filter(l => l.status === 'REPAYING');
  }, [cachedLoans]);
  const [loading, setLoading] = useState(!repayments || repayments.length === 0);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const { showToast } = useToast();

  // Bank account state
  const [bankInfo, setBankInfo] = useState<BankAccountInfo | null>(null);
  const [newBankAccount, setNewBankAccount] = useState('');
  const [savingBank, setSavingBank] = useState(false);
  const [useAutoDeduct, setUseAutoDeduct] = useState(false);
  const [autoDeducting, setAutoDeducting] = useState(false);

  // Form states
  const [selectedLoanId, setSelectedLoanId] = useState('');
  const [amount, setAmount] = useState('');
  const [month, setMonth] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const monthStr = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${monthStr}`;
  });

  const isAdminOrTreasurer = currentUser?.role === 'ADMIN' || currentUser?.role === 'TREASURER';

  const selectableLoans = React.useMemo(() => {
    if (isAdminOrTreasurer) return activeLoans;
    if (!currentUser) return [];
    return activeLoans.filter(l => l.applicantId === currentUser.id);
  }, [activeLoans, isAdminOrTreasurer, currentUser]);

  const selectedLoan = React.useMemo(() => {
    return activeLoans.find(l => l.id === selectedLoanId);
  }, [activeLoans, selectedLoanId]);

  const hasBankAcc = selectedLoan?.applicant?.hasBankAccount || false;

  // Auto-select loan if there's only one
  useEffect(() => {
    if (selectableLoans.length === 1 && !selectedLoanId) {
      const timer = setTimeout(() => {
        setSelectedLoanId(selectableLoans[0].id);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [selectableLoans, selectedLoanId]);

  // Sync autoDeduct switch with selected loan's settings
  useEffect(() => {
    const timer = setTimeout(() => {
      if (selectedLoan) {
        setUseAutoDeduct(selectedLoan.applicant?.autoDeductEnabled || false);
      } else {
        setUseAutoDeduct(false);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [selectedLoanId, selectedLoan]);

  const fetchBankInfo = useCallback(async () => {
    try {
      const res = await fetch('/api/members/bank-account');
      if (res.ok) {
        const data = await res.json();
        setBankInfo(data);
        setUseAutoDeduct(data.autoDeductEnabled && data.hasBankAccount);
      }
    } catch {
      console.error('Failed to fetch bank account info');
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      // Async revalidation in the background
      await Promise.all([fetchRepayments(), fetchLoans(), fetchBankInfo()]);
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
  }, [fetchRepayments, fetchLoans, fetchBankInfo]);

  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoanId || !amount || !month) return;

    if (useAutoDeduct && hasBankAcc) {
      // Skip payment modal — auto-deduct directly
      handleAutoDeduct();
    } else {
      setIsModalOpen(false);
      setIsPaymentOpen(true);
    }
  };

  const handleAutoDeduct = async () => {
    setAutoDeducting(true);
    setIsModalOpen(false);

    try {
      // 1. Initiate deduction from bank
      const deductRes = await fetch('/api/members/bank-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(amount),
          memberId: selectedLoan?.applicantId,
        }),
      });

      if (!deductRes.ok) {
        const errData = await deductRes.json();
        showToast(errData.error || 'Auto-deduction failed. Please use manual payment.', 'error');
        setAutoDeducting(false);
        return;
      }

      const deductData = await deductRes.json();

      // 2. Record the repayment
      const res = await fetch('/api/repayments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loanId: selectedLoanId,
          amount: parseFloat(amount),
          month,
          paymentMethod: deductData.paymentMethod,
          referenceNumber: deductData.referenceNumber,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || 'Failed to record repayment', 'error');
      } else {
        showToast(
          `✅ Auto-deducted ${formatCurrency(parseFloat(amount))} from ${deductData.maskedAccount}. Ref: ${deductData.referenceNumber}`,
          'success',
        );
        setSelectedLoanId('');
        setAmount('');
        setMonth('');
        fetchRepayments();
      }
    } catch {
      showToast('An error occurred during auto-deduction.', 'error');
    } finally {
      setAutoDeducting(false);
    }
  };

  const handlePaymentSuccess = async (details: {
    paymentMethod: string;
    referenceNumber: string;
    razorpayOrderId?: string;
    razorpaySignature?: string;
  }) => {
    try {
      const res = await fetch('/api/repayments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loanId: selectedLoanId,
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
        showToast(data.error || 'Failed to record repayment', 'error');
      } else {
        showToast('Repayment transaction successful! EMI logged.', 'success');
        setSelectedLoanId('');
        setAmount('');
        setMonth('');
        fetchRepayments();
      }
    } catch {
      showToast('An error occurred during payment verification.', 'error');
    }
  };

  const handleConfirm = async (id: string) => {
    try {
      const res = await fetch(`/api/repayments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'confirm' }),
      });

      if (res.ok) {
        showToast('Repayment confirmed successfully', 'success');
        fetchRepayments();
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to confirm repayment', 'error');
      }
    } catch {
      showToast('An error occurred during confirmation', 'error');
    }
  };

  const handleSaveBankAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBank(true);
    try {
      const res = await fetch('/api/members/bank-account', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankAccountNumber: newBankAccount,
          autoDeductEnabled: true,
        }),
      });

      if (res.ok) {
        showToast('Bank account saved. Auto-deduction enabled!', 'success');
        setIsBankModalOpen(false);
        setNewBankAccount('');
        fetchBankInfo();
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to save bank account', 'error');
      }
    } catch {
      showToast('An error occurred. Please try again.', 'error');
    } finally {
      setSavingBank(false);
    }
  };

  const handleRemoveBankAccount = async () => {
    if (!confirm('Remove saved bank account and disable auto-deduction?')) return;
    try {
      const res = await fetch('/api/members/bank-account', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bankAccountNumber: '', autoDeductEnabled: false }),
      });
      if (res.ok) {
        showToast('Bank account removed.', 'success');
        setBankInfo(prev => prev ? { ...prev, hasBankAccount: false, maskedAccount: null, autoDeductEnabled: false } : null);
        setUseAutoDeduct(false);
      }
    } catch {
      showToast('Failed to remove bank account', 'error');
    }
  };


  const columns: Column<Repayment>[] = [
    { key: 'month', label: 'Month', sortable: true },
    {
      key: 'loan',
      label: 'Borrower',
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
      label: 'EMI Paid',
      sortable: true,
      render: (val) => (
        <span style={{ fontWeight: '700', color: 'var(--accent-primary)' }}>{formatCurrency(val)}</span>
      ),
    },
    {
      key: 'principalPortion',
      label: 'Principal',
      sortable: true,
      render: (val) => formatCurrency(val),
    },
    {
      key: 'interestPortion',
      label: 'Interest',
      sortable: true,
      render: (val) => (
        <span style={{ color: val > 0 ? 'var(--accent-warning)' : 'var(--text-muted)' }}>
          {formatCurrency(val)}
        </span>
      ),
    },
    {
      key: 'paidAt',
      label: 'Date Paid',
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
            <button
              onClick={() => handleConfirm(row.id)}
              className="btn btn-primary btn-sm"
            >
              Confirm
            </button>
          );
        }
        return <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>—</span>;
      },
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Auto-Deduct Banner */}
      <div className="glass-card" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {/* Bank icon */}
            <div style={{
              width: '44px', height: '44px',
              background: bankInfo?.hasBankAccount ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.05)',
              borderRadius: '10px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              border: `1px solid ${bankInfo?.hasBankAccount ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.08)'}`,
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                stroke={bankInfo?.hasBankAccount ? 'var(--accent-primary)' : 'var(--text-muted)'} strokeWidth="2">
                <rect x="3" y="10" width="18" height="11" rx="2" />
                <path d="M12 3L3 10h18L12 3z" />
                <line x1="8" y1="14" x2="8" y2="17" />
                <line x1="12" y1="14" x2="12" y2="17" />
                <line x1="16" y1="14" x2="16" y2="17" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '2px' }}>
                {bankInfo?.hasBankAccount
                  ? `Saved Account: ${bankInfo.maskedAccount}`
                  : 'Auto-Deduction from Bank Account'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {bankInfo?.hasBankAccount
                  ? bankInfo.autoDeductEnabled
                    ? '✅ Auto-deduction is active — EMI will be deducted automatically when you submit'
                    : 'Auto-deduction is off — click to toggle'
                  : 'Save your bank account to enable one-click EMI auto-deduction'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {bankInfo?.hasBankAccount && (
              <>
                {/* Toggle auto-deduct */}
                <button
                  onClick={async () => {
                    const newVal = !bankInfo.autoDeductEnabled;
                    await fetch('/api/members/bank-account', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ autoDeductEnabled: newVal }),
                    });
                    setBankInfo(prev => prev ? { ...prev, autoDeductEnabled: newVal } : null);
                    setUseAutoDeduct(newVal);
                    showToast(newVal ? 'Auto-deduction enabled' : 'Auto-deduction disabled', 'success');
                  }}
                  className={`btn btn-sm ${bankInfo.autoDeductEnabled ? 'btn-primary' : 'btn-secondary'}`}
                >
                  {bankInfo.autoDeductEnabled ? '🟢 Auto-Deduct ON' : '⚪ Auto-Deduct OFF'}
                </button>
                <button
                  onClick={handleRemoveBankAccount}
                  className="btn btn-sm btn-ghost"
                  style={{ color: 'var(--accent-danger)', fontSize: '12px' }}
                >
                  Remove
                </button>
              </>
            )}
            {!bankInfo?.hasBankAccount && (
              <button onClick={() => setIsBankModalOpen(true)} className="btn btn-primary btn-sm">
                + Link Bank Account
              </button>
            )}
            {(isAdminOrTreasurer || (selectableLoans && selectableLoans.length > 0)) && (
              <button
                onClick={() => {
                  const now = new Date();
                  const year = now.getFullYear();
                  const monthStr = String(now.getMonth() + 1).padStart(2, '0');
                  setMonth(`${year}-${monthStr}`);
                  setIsModalOpen(true);
                }}
                className="btn btn-primary"
                disabled={autoDeducting}
              >
                {autoDeducting ? (
                  <>
                    <svg className="spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" />
                      <path d="M12 2a10 10 0 0 1 10 10" />
                    </svg>
                    Processing...
                  </>
                ) : isAdminOrTreasurer ? 'Record Repayment' : 'Pay EMI'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Repayments Table */}
      <div className="glass-card" style={{ padding: '0' }}>
        {loading ? (
          <div className="skeleton" style={{ height: '320px', borderRadius: '16px' }} />
        ) : (
          <DataTable
            columns={columns}
            data={repayments}
            searchable
            searchPlaceholder="Search by borrower, month, or status…"
            emptyMessage="No repayments recorded yet."
          />
        )}
      </div>

      {/* Record Repayment Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isAdminOrTreasurer ? "Record Loan Repayment" : "Pay Loan EMI"}
        footer={(
          <>
            <button onClick={() => setIsModalOpen(false)} className="btn btn-ghost">Cancel</button>
            <button type="submit" form="repay-form" className="btn btn-primary">
              {useAutoDeduct && hasBankAcc ? '⚡ Auto-Deduct & Save' : isAdminOrTreasurer ? 'Record Repayment' : 'Proceed to Payment'}
            </button>
          </>
        )}
      >
        <form id="repay-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Auto-deduct status in modal */}
          {hasBankAcc && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px',
              background: useAutoDeduct ? 'rgba(16,185,129,0.07)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${useAutoDeduct ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.07)'}`,
              borderRadius: '10px',
            }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
                  {isAdminOrTreasurer 
                    ? `Auto-Deduct from Borrower's Saved Bank Account` 
                    : `Auto-Deduct from Saved Bank Account`}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {useAutoDeduct
                    ? 'EMI will be deducted directly from the bank account'
                    : 'Toggle on to skip the payment gateway step'}
                </div>
              </div>
              {/* Toggle switch */}
              <button
                type="button"
                onClick={() => setUseAutoDeduct(v => !v)}
                style={{
                  position: 'relative', width: '44px', height: '24px',
                  borderRadius: '12px',
                  background: useAutoDeduct ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)',
                  border: 'none', cursor: 'pointer', transition: 'background 0.2s',
                  flexShrink: 0,
                }}
                title="Toggle auto-deduction"
              >
                <span style={{
                  position: 'absolute', top: '3px',
                  left: useAutoDeduct ? '23px' : '3px',
                  width: '18px', height: '18px',
                  borderRadius: '50%', background: '#fff',
                  transition: 'left 0.2s',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                }} />
              </button>
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="loan-select">Active Loan Account</label>
            <select
              id="loan-select"
              className="select"
              value={selectedLoanId}
              onChange={(e) => setSelectedLoanId(e.target.value)}
              required
            >
              <option value="">Select Active Loan…</option>
              {selectableLoans.map(l => (
                <option key={l.id} value={l.id}>
                  {l.applicant.name} — Principal: {formatCurrency(l.amount)}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="repay-amount">EMI Amount (₹)</label>
              <input
                id="repay-amount"
                type="number"
                className="input"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                min="1"
                step="0.01"
                placeholder="e.g. 5000"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="repay-month">Repayment Month</label>
              <input
                id="repay-month"
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

      {/* Link Bank Account Modal */}
      <Modal
        isOpen={isBankModalOpen}
        onClose={() => setIsBankModalOpen(false)}
        title="Link Bank Account for Auto-Deduction"
        size="sm"
      >
        <form onSubmit={handleSaveBankAccount} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Info banner */}
          <div style={{
            display: 'flex', gap: '12px', alignItems: 'flex-start',
            padding: '14px 16px',
            background: 'rgba(59,130,246,0.07)',
            border: '1px solid rgba(59,130,246,0.18)',
            borderRadius: '10px',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-info)" strokeWidth="2" style={{ flexShrink: 0, marginTop: '1px' }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>
              Your bank account number is stored with <strong>AES-256 encryption</strong>.
              Only the last 4 digits will ever be displayed. Auto-deduction initiates an
              NACH mandate withdrawal on each EMI date.
            </p>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="bank-acc-num">Bank Account Number</label>
            <input
              id="bank-acc-num"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              className="input"
              value={newBankAccount}
              onChange={(e) => setNewBankAccount(e.target.value.replace(/\D/g, ''))}
              placeholder="Enter account number (digits only)"
              minLength={8}
              maxLength={20}
              required
              style={{ letterSpacing: '2px', fontFamily: 'monospace', fontSize: '16px' }}
            />
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              8–20 digit account number. IFSC is not required for NACH mandates.
            </span>
          </div>

          {/* Security visual */}
          <div style={{
            display: 'flex', gap: '16px',
            padding: '12px 16px',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '8px',
          }}>
            {[
              { icon: '🔒', label: 'AES-256 Encrypted' },
              { icon: '👁️', label: 'Masked Display Only' },
              { icon: '🔐', label: 'Server-Side Only' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flex: 1 }}>
                <span style={{ fontSize: '20px' }}>{item.icon}</span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center' }}>{item.label}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button type="button" onClick={() => setIsBankModalOpen(false)} className="btn btn-ghost" style={{ flex: 1 }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={savingBank}>
              {savingBank ? (
                <>
                  <svg className="spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" />
                    <path d="M12 2a10 10 0 0 1 10 10" />
                  </svg>
                  Saving…
                </>
              ) : '🔗 Save & Enable Auto-Deduct'}
            </button>
          </div>
        </form>
      </Modal>

      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        amount={parseFloat(amount) || 0}
        purpose="Monthly Loan Repayment EMI"
        onPaymentSuccess={handlePaymentSuccess}
      />
    </div>
  );
}
