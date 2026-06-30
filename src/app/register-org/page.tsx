'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterOrgPage() {
  const [orgName, setOrgName] = useState('');
  const [orgCode, setOrgCode] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminEmployeeId, setAdminEmployeeId] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register-org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgName,
          orgCode: orgCode.toUpperCase(),
          adminName,
          adminEmail,
          adminPassword,
          adminEmployeeId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed. Please check inputs.');
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-split-container">
      {/* Left side banner */}
      <div className="auth-split-left animate-fadeIn">
        <div className="auth-split-left-header">
          <div style={{
            background: 'linear-gradient(135deg, var(--emerald), #6366f1)',
            borderRadius: '8px',
            padding: '6px',
            color: '#0a0e1a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              <circle cx="12" cy="16" r="1"/>
            </svg>
          </div>
          <span style={{ fontSize: '20px', fontWeight: '800', letterSpacing: '-0.5px' }} className="text-gradient">
            SocietyVault
          </span>
        </div>

        <div className="auth-split-left-content">
          <span className="badge badge-neutral" style={{ width: 'fit-content', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '8px' }}>
            Ledger-Secured
          </span>
          <h2 style={{ fontSize: '38px', fontWeight: '900', lineHeight: '1.25', margin: 0, color: 'var(--text-primary)' }}>
            Initialize Your <br />
            <span className="text-gradient">Cooperative Portal</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '15px', lineHeight: '1.6', margin: '8px 0 0 0' }}>
            Set up an isolated cooperative lending portal with customizable interest, loan, approval, and repayment policies tailored for your organization.
          </p>

          <div className="auth-split-left-features">
            <div className="auth-split-left-feature">
              <div className="auth-split-left-feature-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                </svg>
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '14px', color: 'var(--text-primary)', fontWeight: '600' }}>Universal Directory Sync</h4>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-tertiary)' }}>Integrate with LDAP, REST directories, or SQL databases to auto-enroll members based on corporate rank.</p>
              </div>
            </div>

            <div className="auth-split-left-feature">
              <div className="auth-split-left-feature-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '14px', color: 'var(--text-primary)', fontWeight: '600' }}>Custom Pay Grades & Policies</h4>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-tertiary)' }}>Configure monthly contribution tiers, maximum borrow thresholds, witness requirements, and interest rates.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="auth-split-left-footer">
          <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: 0 }}>
            🔒 System is protected under corporate security subnet restrictions and active directory policies.
          </p>
        </div>
      </div>

      {/* Right side form */}
      <div className="auth-split-right">
        {/* Subtle background glow */}
        <div style={{
          position: 'absolute',
          top: '25%',
          right: '15%',
          width: '280px',
          height: '280px',
          borderRadius: '50%',
          background: 'rgba(16, 185, 129, 0.06)',
          filter: 'blur(100px)',
          pointerEvents: 'none'
        }} />

        <div className="glass-card slide-up" style={{
          width: '100%',
          maxWidth: '560px',
          padding: '40px 36px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5), 0 0 20px rgba(99, 102, 241, 0.05)',
          borderRadius: '16px',
          zIndex: 1
        }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h1 style={{ margin: 0, fontSize: '26px', fontWeight: '800', letterSpacing: '-0.5px' }} className="text-gradient">Register Space</h1>
            <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: 'var(--text-secondary)' }}>
              Initialize a secure cooperative lending portal for your company
            </p>
          </div>

          {error && (
            <div className="form-error" style={{
              padding: '12px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: 'var(--accent-danger)',
              fontSize: '13px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="orgName">Organization Name</label>
                <input
                  id="orgName"
                  type="text"
                  className="input"
                  placeholder="e.g. National Bank of India"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              
              <div className="form-group">
                <label className="form-label" htmlFor="orgCode">Workspace Code (ID)</label>
                <input
                  id="orgCode"
                  type="text"
                  className="input"
                  placeholder="e.g. NBI-COOP"
                  style={{ textTransform: 'uppercase' }}
                  value={orgCode}
                  onChange={(e) => setOrgCode(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div style={{ height: '1px', background: 'var(--border-color)', margin: '8px 0' }} />
            
            <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Founding Administrator Account
            </span>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="adminName">Admin Full Name</label>
                <input
                  id="adminName"
                  type="text"
                  className="input"
                  placeholder="e.g. Rajesh Kumar"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="adminEmployeeId">Employee ID</label>
                <input
                  id="adminEmployeeId"
                  type="text"
                  className="input"
                  placeholder="e.g. EMP001"
                  value={adminEmployeeId}
                  onChange={(e) => setAdminEmployeeId(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="adminEmail">Workspace Email</label>
                <input
                  id="adminEmail"
                  type="email"
                  className="input"
                  placeholder="admin@organization.com"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="adminPassword">Login Password</label>
                <input
                  id="adminPassword"
                  type="password"
                  className="input"
                  placeholder="Min 8 characters"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px', marginTop: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <svg className="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="2" x2="12" y2="6" />
                    <line x1="12" y1="18" x2="12" y2="22" />
                    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
                    <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
                    <line x1="2" y1="12" x2="6" y2="12" />
                    <line x1="18" y1="12" x2="22" y2="12" />
                    <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
                    <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
                  </svg>
                  Creating Space...
                </>
              ) : 'Initialize Society Space'}
            </button>
          </form>

          <div style={{ marginTop: '28px', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
            Already have a society space?{' '}
            <Link href="/login" style={{ color: 'var(--accent-secondary)', fontWeight: '600', textDecoration: 'none' }}>
              Sign In Here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
