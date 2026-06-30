'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useToast } from '@/components/Toast';
import { formatCurrency } from '@/lib/utils';


interface PayGrade {
  id: string;
  gradeName: string;
  level: number;
  monthlyContribution: number;
  description: string | null;
}

export default function SettingsAdminPage() {
  const [payGrades, setPayGrades] = useState<PayGrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [savingGrade, setSavingGrade] = useState(false);

  const { showToast } = useToast();

  // Policy form states
  const [interestModel, setInterestModel] = useState('NONE');
  const [interestRate, setInterestRate] = useState(0);
  const [maxLoanAmount, setMaxLoanAmount] = useState(100000);
  const [loanMultiplierCap, setLoanMultiplierCap] = useState(3);
  const [maxTenureMonths, setMaxTenureMonths] = useState(24);
  const [minWitnesses, setMinWitnesses] = useState(3);
  const [minWitnessApprovals, setMinWitnessApprovals] = useState(2);
  const [approvalMode, setApprovalMode] = useState('ADMIN_ONLY');
  const [repaymentMode, setRepaymentMode] = useState('MANUAL');
  const [coolingPeriodDays, setCoolingPeriodDays] = useState(30);
  const [maxConcurrentLoans, setMaxConcurrentLoans] = useState(1);

  // Pay Grade form states (for adding new)
  const [newGradeName, setNewGradeName] = useState('');
  const [newGradeLevel, setNewGradeLevel] = useState('');
  const [newGradeContribution, setNewGradeContribution] = useState('');
  const [newGradeDescription, setNewGradeDescription] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [policyRes, gradesRes] = await Promise.all([
        fetch('/api/org/policy'),
        fetch('/api/org/pay-grades'),
      ]);

      if (policyRes.ok) {
        const pData = await policyRes.json();
        setInterestModel(pData.interestModel);
        setInterestRate(pData.interestRate);
        setMaxLoanAmount(pData.maxLoanAmount);
        setLoanMultiplierCap(pData.loanMultiplierCap);
        setMaxTenureMonths(pData.maxTenureMonths);
        setMinWitnesses(pData.minWitnesses);
        setMinWitnessApprovals(pData.minWitnessApprovals);
        setApprovalMode(pData.approvalMode);
        setRepaymentMode(pData.repaymentMode);
        setCoolingPeriodDays(pData.coolingPeriodDays);
        setMaxConcurrentLoans(pData.maxConcurrentLoans);
      }

      if (gradesRes.ok) {
        setPayGrades(await gradesRes.json());
      }
    } catch {
      showToast('Failed to fetch settings data', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchData]);

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPolicy(true);

    try {
      const res = await fetch('/api/org/policy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interestModel,
          interestRate: Number(interestRate),
          maxLoanAmount: Number(maxLoanAmount),
          loanMultiplierCap: Number(loanMultiplierCap),
          maxTenureMonths: Number(maxTenureMonths),
          minWitnesses: Number(minWitnesses),
          minWitnessApprovals: Number(minWitnessApprovals),
          approvalMode,
          repaymentMode,
          coolingPeriodDays: Number(coolingPeriodDays),
          maxConcurrentLoans: Number(maxConcurrentLoans),
        }),
      });

      if (res.ok) {
        showToast('Policies saved successfully', 'success');
        fetchData();
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to save policies', 'error');
      }
    } catch {
      showToast('An error occurred. Please try again.', 'error');
    } finally {
      setSavingPolicy(false);
    }
  };

  const handleAddPayGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingGrade(true);

    try {
      const res = await fetch('/api/org/pay-grades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gradeName: newGradeName,
          level: Number(newGradeLevel),
          monthlyContribution: Number(newGradeContribution),
          description: newGradeDescription || null,
        }),
      });

      if (res.ok) {
        showToast('Pay grade tier added successfully', 'success');
        setNewGradeName('');
        setNewGradeLevel('');
        setNewGradeContribution('');
        setNewGradeDescription('');
        fetchData();
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to add pay grade', 'error');
      }
    } catch {
      showToast('An error occurred. Please try again.', 'error');
    } finally {
      setSavingGrade(false);
    }
  };

  const handleDeletePayGrade = async (id: string) => {
    if (!confirm('Are you sure you want to delete this pay grade tier?')) return;

    try {
      const res = await fetch(`/api/org/pay-grades/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        showToast('Pay grade tier deleted', 'success');
        fetchData();
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to delete pay grade', 'error');
      }
    } catch {
      showToast('An error occurred during deletion', 'error');
    }
  };

  if (loading) {
    return <div className="skeleton" style={{ height: '480px', borderRadius: '12px' }} />;
  }

  return (
    <div className="responsive-grid-split" style={{ gap: '32px' }}>
      
      {/* Left Column: Policy settings */}
      <form onSubmit={handleSavePolicy} style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
        
        {/* Core Settings */}
        <div className="glass-card" style={{ padding: '28px' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '700' }}>Lending Rules & Policy</h3>
          
          <div className="responsive-grid-2col" style={{ gap: '20px', marginBottom: '20px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="max-loan">Max Permitted Loan (₹)</label>
              <input
                id="max-loan"
                type="number"
                className="input"
                value={maxLoanAmount}
                onChange={(e) => setMaxLoanAmount(Number(e.target.value))}
                required
              />
            </div>
            
            <div className="form-group">
              <label className="form-label" htmlFor="mult-cap">Savings Multiplier Cap (e.g. 3x)</label>
              <input
                id="mult-cap"
                type="number"
                className="input"
                value={loanMultiplierCap}
                onChange={(e) => setLoanMultiplierCap(Number(e.target.value))}
                required
              />
            </div>
          </div>

          <div className="responsive-grid-2col" style={{ gap: '20px', marginBottom: '20px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="max-tenure">Max Tenure (Months)</label>
              <input
                id="max-tenure"
                type="number"
                className="input"
                value={maxTenureMonths}
                onChange={(e) => setMaxTenureMonths(Number(e.target.value))}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="cooling-pd">Cooling Period between Loans (Days)</label>
              <input
                id="cooling-pd"
                type="number"
                className="input"
                value={coolingPeriodDays}
                onChange={(e) => setCoolingPeriodDays(Number(e.target.value))}
                required
              />
            </div>
          </div>

          <div className="responsive-grid-2col" style={{ gap: '20px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="max-loans">Max Concurrent Active Loans</label>
              <input
                id="max-loans"
                type="number"
                className="input"
                value={maxConcurrentLoans}
                onChange={(e) => setMaxConcurrentLoans(Number(e.target.value))}
                required
              />
            </div>
          </div>
        </div>

        {/* Interest settings */}
        <div className="glass-card" style={{ padding: '28px' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '700' }}>Interest calculation</h3>
          
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label className="form-label">Interest Model</label>
            <div style={{ display: 'flex', gap: '24px', margin: '8px 0' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input 
                  type="radio" 
                  id="model-none" 
                  name="model" 
                  value="NONE" 
                  checked={interestModel === 'NONE'} 
                  onChange={(e) => setInterestModel(e.target.value)} 
                  style={{ cursor: 'pointer' }}
                />
                <label htmlFor="model-none" style={{ cursor: 'pointer', fontSize: '14px' }}>None (0% Interest)</label>
              </div>
              
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input 
                  type="radio" 
                  id="model-flat" 
                  name="model" 
                  value="FLAT" 
                  checked={interestModel === 'FLAT'} 
                  onChange={(e) => setInterestModel(e.target.value)} 
                  style={{ cursor: 'pointer' }}
                />
                <label htmlFor="model-flat" style={{ cursor: 'pointer', fontSize: '14px' }}>Flat Rate Per Annum</label>
              </div>
            </div>
          </div>

          {interestModel !== 'NONE' && (
            <div className="form-group">
              <label className="form-label" htmlFor="int-rate">Annual Interest Rate (%)</label>
              <input
                id="int-rate"
                type="number"
                step="0.1"
                className="input"
                value={interestRate}
                onChange={(e) => setInterestRate(Number(e.target.value))}
                required
              />
            </div>
          )}
        </div>

        {/* Approval policies */}
        <div className="glass-card" style={{ padding: '28px' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '700' }}>Verification & Approval Workflows</h3>
          
          <div className="responsive-grid-2col" style={{ gap: '20px', marginBottom: '20px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="min-wit">Min Witnesses Required</label>
              <input
                id="min-wit"
                type="number"
                className="input"
                value={minWitnesses}
                onChange={(e) => setMinWitnesses(Number(e.target.value))}
                required
              />
            </div>
            
            <div className="form-group">
              <label className="form-label" htmlFor="min-wit-app">Min Witness co-signatures Needed</label>
              <input
                id="min-wit-app"
                type="number"
                className="input"
                value={minWitnessApprovals}
                onChange={(e) => setMinWitnessApprovals(Number(e.target.value))}
                required
              />
            </div>
          </div>

          <div className="responsive-grid-2col" style={{ gap: '20px', marginBottom: '20px' }}>
            <div className="form-group">
              <label className="form-label">Lending Approval Mode</label>
              <select
                className="select"
                value={approvalMode}
                onChange={(e) => setApprovalMode(e.target.value)}
                required
              >
                <option value="ADMIN_ONLY">Direct Admin Review Only</option>
                <option value="ADMIN_AND_WITNESSES">Witness Co-signature + Admin Review</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Repayment Collections Model</label>
              <select
                className="select"
                value={repaymentMode}
                onChange={(e) => setRepaymentMode(e.target.value)}
                required
              >
                <option value="MANUAL">Manual Record Logging by Treasurer</option>
                <option value="AUTO_DEDUCT">Auto-Deducted from Monthly Contributions</option>
              </select>
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={savingPolicy}
            style={{ width: '100%', padding: '12px', marginTop: '8px' }}
          >
            {savingPolicy ? 'Saving policies...' : 'Save Organization Policies'}
          </button>
        </div>
      </form>

      {/* Right Column: Pay grade tiers config */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        
        {/* Tier Config List */}
        <div className="glass-card" style={{ padding: '28px' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '700' }}>Pay Grades & Contributions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '380px', overflowY: 'auto', paddingRight: '4px' }}>
            {payGrades.map((grade) => (
              <div key={grade.id} style={{
                background: 'rgba(255,255,255,0.01)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <span style={{ fontSize: '14px', fontWeight: '600', display: 'block' }}>
                    {grade.gradeName} (Level {grade.level})
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    EMI: {formatCurrency(grade.monthlyContribution)}/month
                  </span>
                </div>
                <button 
                  onClick={() => handleDeletePayGrade(grade.id)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '6px',
                    borderRadius: '6px'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-danger)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                  title="Delete Tier"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    <line x1="10" y1="11" x2="10" y2="17" />
                    <line x1="14" y1="11" x2="14" y2="17" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Add Tier Form */}
        <div className="glass-card" style={{ padding: '28px' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '700' }}>Add Pay Grade Tier</h3>
          
          <form onSubmit={handleAddPayGrade} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="grade-name">Grade Name</label>
              <input
                id="grade-name"
                type="text"
                className="input"
                placeholder="e.g. Junior Clerk"
                value={newGradeName}
                onChange={(e) => setNewGradeName(e.target.value)}
                required
              />
            </div>

            <div className="responsive-grid-2col" style={{ gap: '12px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="grade-level">Grade Level</label>
                <input
                  id="grade-level"
                  type="number"
                  className="input"
                  placeholder="e.g. 1"
                  value={newGradeLevel}
                  onChange={(e) => setNewGradeLevel(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="grade-contrib">Monthly Contribution (₹)</label>
                <input
                  id="grade-contrib"
                  type="number"
                  className="input"
                  placeholder="e.g. 500"
                  value={newGradeContribution}
                  onChange={(e) => setNewGradeContribution(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="grade-desc">Short Description</label>
              <input
                id="grade-desc"
                type="text"
                className="input"
                placeholder="e.g. Entry level office assistants"
                value={newGradeDescription}
                onChange={(e) => setNewGradeDescription(e.target.value)}
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={savingGrade}
              style={{ width: '100%', padding: '10px' }}
            >
              {savingGrade ? 'Adding Tier...' : 'Add Grade Tier'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
