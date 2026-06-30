'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserProfile } from '@/context/WorkspaceContext';
import { SearchableSelect } from '@/components/SearchableSelect';
import { useToast } from '@/components/Toast';
import { formatCurrency, calculateEMI } from '@/lib/utils';

interface Member {
  id: string;
  name: string;
  employeeId: string;
  rank: string | null;
}

interface Policy {
  interestModel: string;
  interestRate: number;
  maxLoanAmount: number;
  loanMultiplierCap: number;
  maxTenureMonths: number;
  minWitnesses: number;
}

export default function ApplyLoanPage() {
  const [step, setStep] = useState(1);
  const [members, setMembers] = useState<Member[]>([]);
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  const router = useRouter();
  const { showToast } = useToast();

  // Form states
  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState('');
  const [category, setCategory] = useState('PERSONAL');
  const [tenureMonths, setTenureMonths] = useState(12);
  const [selectedWitnesses, setSelectedWitnesses] = useState<string[]>([]);
  
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        const [meRes, policyRes, membersRes] = await Promise.all([
          fetch('/api/auth/me'),
          fetch('/api/org/policy'),
          fetch('/api/members'),
        ]);

        if (meRes.ok && isMounted) setCurrentUser(await meRes.json());
        if (policyRes.ok && isMounted) setPolicy(await policyRes.json());
        if (membersRes.ok && isMounted) setMembers(await membersRes.json());
      } catch {
        showToast('Failed to fetch required configuration data', 'error');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, [showToast]);

  const handleNext = () => {
    if (step === 1) {
      const amt = parseFloat(amount);
      if (isNaN(amt) || amt <= 0) {
        showToast('Please enter a valid loan amount', 'warning');
        return;
      }
      if (policy && amt > policy.maxLoanAmount) {
        showToast(`Amount exceeds organization maximum limit of ${formatCurrency(policy.maxLoanAmount)}`, 'warning');
        return;
      }
      if (currentUser && policy) {
        const cap = currentUser.totalContributed * policy.loanMultiplierCap;
        if (amt > cap) {
          showToast(`Amount exceeds your multiplier limit. Maximum is ${formatCurrency(cap)} (${policy.loanMultiplierCap}x savings)`, 'warning');
          return;
        }
      }
      if (purpose.trim().length < 10) {
        showToast('Please provide a detailed purpose (min 10 characters)', 'warning');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (policy && selectedWitnesses.length < policy.minWitnesses) {
        showToast(`Please select at least ${policy.minWitnesses} witnesses`, 'warning');
        return;
      }
      setStep(3);
    }
  };

  const handleBack = () => {
    setStep(prev => prev - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch('/api/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(amount),
          purpose,
          category,
          tenureMonths,
          witnessIds: selectedWitnesses,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || 'Failed to submit application', 'error');
      } else {
        showToast('Loan application submitted. Petitions sent to witnesses.', 'success');
        router.push(`/loans/${data.id}`);
      }
    } catch {
      showToast('An error occurred during submission', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="skeleton" style={{ height: '400px', borderRadius: '12px' }} />;
  }

  const witnessOptions = members
    .filter(m => m.id !== currentUser?.id)
    .map(m => ({
      value: m.id,
      label: m.name,
      subtitle: `ID: ${m.employeeId} ${m.rank ? `| ${m.rank}` : ''}`
    }));

  const emi = calculateEMI(
    parseFloat(amount) || 0,
    policy?.interestModel !== 'NONE' ? policy?.interestRate || 0 : 0,
    tenureMonths
  );

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }}>
      
      {/* Progress indicators */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px', position: 'relative' }}>
        <div style={{
          position: 'absolute',
          top: '16px',
          left: '8%',
          right: '8%',
          height: '2px',
          background: 'var(--border-color)',
          zIndex: 0
        }}>
          <div style={{
            height: '100%',
            background: 'var(--accent-primary)',
            width: `${((step - 1) / 2) * 100}%`,
            transition: 'width 0.3s ease'
          }} />
        </div>

        {[1, 2, 3].map(s => (
          <div key={s} style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            zIndex: 1,
            position: 'relative'
          }}>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              background: s <= step ? 'var(--accent-primary)' : 'var(--bg-secondary)',
              border: `2px solid ${s <= step ? 'var(--accent-primary)' : 'var(--border-color)'}`,
              color: s <= step ? '#0a0e1a' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '700',
              boxShadow: s === step ? '0 0 12px var(--accent-primary)' : 'none',
              transition: 'all 0.3s'
            }}>
              {s}
            </div>
            <span style={{
              fontSize: '11px',
              color: s <= step ? 'var(--text-primary)' : 'var(--text-muted)',
              marginTop: '8px',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              {s === 1 ? 'Details' : s === 2 ? 'Witnesses' : 'Verify'}
            </span>
          </div>
        ))}
      </div>

      <div className="glass-card" style={{ padding: '36px' }}>
        {step === 1 && (
          <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>Loan Amount & Purpose</h3>
            
            <div className="responsive-grid-2col" style={{ gap: '16px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="loan-amount">Amount (₹)</label>
                <input
                  id="loan-amount"
                  type="number"
                  className="input"
                  placeholder="e.g. 50000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
                {policy && (
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                    Max limit: {formatCurrency(policy.maxLoanAmount)}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="loan-category">Loan Category</label>
                <select
                  id="loan-category"
                  className="select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="PERSONAL">Personal Needs</option>
                  <option value="EMERGENCY">Emergency Funding</option>
                  <option value="MEDICAL">Medical Bills</option>
                  <option value="EDUCATION">Education Fees</option>
                  <option value="HOUSING">Home Repair</option>
                  <option value="OTHER">Other Purpose</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="loan-tenure">Repayment Tenure ({tenureMonths} Months)</label>
                <input
                  id="loan-tenure"
                  type="range"
                  min="3"
                  max={policy?.maxTenureMonths || 36}
                  step="3"
                  className="input"
                  style={{ padding: 0, height: '6px', background: 'var(--border-color)', cursor: 'pointer' }}
                  value={tenureMonths}
                  onChange={(e) => setTenureMonths(parseInt(e.target.value))}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  <span>3 Months</span>
                  <span>{policy?.maxTenureMonths || 36} Months max</span>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="loan-purpose">Detailed Explanation</label>
              <textarea
                id="loan-purpose"
                className="textarea"
                placeholder="Explain why you require this loan..."
                style={{ minHeight: '120px' }}
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
              <button onClick={handleNext} className="btn btn-primary">
                Next: Witnesses
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>Select Witnesses</h3>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
              Choose other organization employees who will witness and vouch for this loan request. They must accept the request before the application is reviewed by administrators.
            </p>

            <div className="form-group" style={{ margin: '12px 0' }}>
              <label className="form-label">Search & Select Witnesses</label>
              <SearchableSelect
                options={witnessOptions}
                selected={selectedWitnesses}
                onChange={setSelectedWitnesses}
                placeholder="Search colleagues by name..."
                multiple
                maxSelections={5}
              />
              {policy && (
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', display: 'block' }}>
                  Minimum {policy.minWitnesses} and maximum 5 witnesses required.
                </span>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
              <button onClick={handleBack} className="btn btn-ghost">Back</button>
              <button onClick={handleNext} className="btn btn-primary">
                Next: Review Terms
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>Review Loan Application</h3>

            <div style={{
              background: 'rgba(255,255,255,0.01)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Loan Principal:</span>
                <span style={{ fontWeight: '700' }}>{formatCurrency(parseFloat(amount))}</span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Interest Rate:</span>
                <span style={{ fontWeight: '700', color: 'var(--accent-warning)' }}>
                  {policy?.interestModel !== 'NONE' ? `${policy?.interestRate}% Flat Per Annum` : '0% (No Interest)'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Repayment Tenure:</span>
                <span style={{ fontWeight: '700' }}>{tenureMonths} Months</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Estimated Monthly EMI:</span>
                <span style={{ fontWeight: '700', color: 'var(--accent-primary)', fontSize: '16px' }}>{formatCurrency(emi)}</span>
              </div>

              <div style={{ height: '1px', background: 'var(--border-color)', margin: '4px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Total Repayable (Over Tenure):</span>
                <span style={{ fontWeight: '700' }}>{formatCurrency(emi * tenureMonths)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Selected Witnesses</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {members.filter(m => selectedWitnesses.includes(m.id)).map(m => (
                  <span key={m.id} className="badge badge-neutral" style={{ padding: '4px 10px' }}>
                    {m.name}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginTop: '8px' }}>
              <input type="checkbox" id="terms-agree" required style={{ marginTop: '4px', cursor: 'pointer' }} />
              <label htmlFor="terms-agree" style={{ fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer', lineHeight: '1.4' }}>
                I agree to the cooperative terms. The monthly repayment EMI will be manually tracked or deducted as per organization lending rules. I understand that the witnesses chosen will be notified.
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
              <button onClick={handleBack} className="btn btn-ghost" disabled={submitting}>Back</button>
              <button 
                onClick={handleSubmit} 
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting ? 'Submitting Application...' : 'Submit Application'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
