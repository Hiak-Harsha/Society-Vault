'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed. Please check your credentials.');
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
            Enterprise Compliance
          </span>
          <h2 style={{ fontSize: '38px', fontWeight: '900', lineHeight: '1.25', margin: 0, color: 'var(--text-primary)' }}>
            Autonomous Banking & <br />
            <span className="text-gradient">Cooperative Savings</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '15px', lineHeight: '1.6', margin: '8px 0 0 0' }}>
            Establish a high-trust internal lending society for employees. Let staff accumulate secure mutual savings, request loans, and sign peer-to-peer witness clearances.
          </p>

          <div className="auth-split-left-features">
            <div className="auth-split-left-feature">
              <div className="auth-split-left-feature-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '14px', color: 'var(--text-primary)', fontWeight: '600' }}>Cryptographic SHA-256 Ledger</h4>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-tertiary)' }}>Every deposit, loan disbursal, and repayment is chronologically chained with previous hashes.</p>
              </div>
            </div>

            <div className="auth-split-left-feature">
              <div className="auth-split-left-feature-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '14px', color: 'var(--text-primary)', fontWeight: '600' }}>PII Column Encryption (AES-256)</h4>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-tertiary)' }}>Employee IDs, roles, and names are encrypted non-deterministically using random initialization vectors.</p>
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
          maxWidth: '420px',
          padding: '40px 32px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5), 0 0 20px rgba(99, 102, 241, 0.05)',
          borderRadius: '16px',
          zIndex: 1
        }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div className="vault-icon animate-pulse" style={{
              background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
              borderRadius: '12px',
              padding: '12px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0a0e1a',
              marginBottom: '16px',
              boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)'
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                <circle cx="12" cy="16" r="1"/>
              </svg>
            </div>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '800', letterSpacing: '-0.5px' }} className="text-gradient">SocietyVault</h1>
            <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: 'var(--text-secondary)' }}>Internal Cooperative Society Workspace</p>
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
            <div className="form-group">
              <label className="form-label" htmlFor="email">Workspace Email</label>
              <input
                id="email"
                type="email"
                className="input"
                placeholder="name@organization.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px', marginTop: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
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
                  Logging in...
                </>
              ) : 'Sign In'}
            </button>
          </form>

          <div style={{ marginTop: '28px', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
            Don&apos;t have an organization workspace?{' '}
            <Link href="/register-org" style={{ color: 'var(--accent-secondary)', fontWeight: '600', textDecoration: 'none' }}>
              Register Organization
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
