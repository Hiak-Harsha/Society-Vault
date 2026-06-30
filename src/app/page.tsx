'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function LandingPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at center, #0e1628 0%, #060a13 100%)',
      color: '#f1f5f9',
      fontFamily: "'Inter', sans-serif",
      position: 'relative',
      overflow: 'hidden'
    }}>
      
      {/* Decorative glows */}
      <div style={{
        position: 'absolute',
        top: '10%',
        left: '15%',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        background: 'var(--accent-secondary)',
        filter: 'blur(130px)',
        opacity: 0.15,
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '10%',
        right: '15%',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        background: 'var(--accent-primary)',
        filter: 'blur(130px)',
        opacity: 0.12,
        pointerEvents: 'none'
      }} />

      {/* Navigation Header */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '24px 8%',
        borderBottom: '1px solid var(--border-color)',
        background: 'rgba(10, 14, 26, 0.4)',
        backdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
            borderRadius: '8px',
            padding: '6px',
            color: '#0a0e1a'
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

        <div style={{ display: 'flex', gap: '20px' }}>
          <Link href="/login" className="btn btn-ghost" style={{ fontSize: '14px', fontWeight: '600' }}>
            Sign In
          </Link>
          <Link href="/register-org" className="btn btn-primary" style={{ fontSize: '14px', fontWeight: '600', padding: '10px 20px' }}>
            Register Organization
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        padding: '100px 24px 60px 24px',
        maxWidth: '960px',
        margin: '0 auto',
        gap: '24px'
      }}>
        <span className="badge badge-neutral" style={{ fontSize: '12px', padding: '6px 14px', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Cooperative Lending Redefined
        </span>
        
        <h1 style={{
          fontSize: '56px',
          fontWeight: '900',
          lineHeight: '1.15',
          letterSpacing: '-1.5px',
          margin: 0
        }}>
          Secure, Transparent <br />
          <span className="text-gradient">Internal Employee Lending</span>
        </h1>

        <p style={{
          fontSize: '18px',
          color: 'var(--text-secondary)',
          lineHeight: '1.6',
          maxWidth: '640px',
          margin: '8px 0'
        }}>
          Host an autonomous lending society within your bank or organization. Allow employees to pool savings, authorize loans, and sign witness clearances with complete audit transparency.
        </p>

        <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
          <Link href="/register-org" className="btn btn-primary btn-lg" style={{ boxShadow: '0 0 20px rgba(16, 185, 129, 0.25)' }}>
            Initialize Cooperative
          </Link>
          <Link href="/login" className="btn btn-secondary btn-lg">
            Enter Workspace
          </Link>
        </div>

        {/* Beautiful Generated Graphic */}
        <div className="glass-card fade-in hero-image-hover" style={{
          width: '100%',
          maxWidth: '820px',
          marginTop: '40px',
          borderRadius: '16px',
          overflow: 'hidden',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 30px 70px rgba(0,0,0,0.6), 0 0 40px rgba(16, 185, 129, 0.1)'
        }}>
          <Image 
            src="/dashboard.png" 
            alt="SocietyVault Live Cooperative Dashboard" 
            width={820}
            height={460}
            style={{
              width: '100%',
              height: 'auto',
              display: 'block'
            }}
            priority
          />
        </div>

        {/* Visual App Preview / Mockup */}
        <div className="glass-card fade-in" style={{
          width: '100%',
          maxWidth: '820px',
          marginTop: '24px',
          padding: '24px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.45)',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.4) 0%, rgba(30, 41, 59, 0.1) 100%)',
          textAlign: 'left',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          {/* Header bar of mockup */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }} />
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#fbbf24' }} />
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }} />
              <span style={{ marginLeft: '12px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>NBI Cooperative Workspace</span>
            </div>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(16, 185, 129, 0.12)',
              color: '#10b981',
              padding: '4px 12px',
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: 600
            }}>
              <span style={{ background: '#10b981', width: '6px', height: '6px', borderRadius: '50%', display: 'inline-block' }} />
              Ledger Secured
            </span>
          </div>

          {/* Core content grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Total Contributed</span>
              <div style={{ fontSize: '20px', fontWeight: '800', marginTop: '6px', color: 'var(--text-primary)', fontFamily: 'monospace' }}>₹4,25,000.00</div>
              <span style={{ fontSize: '11px', color: '#34d399', display: 'block', marginTop: '4px', fontWeight: 500 }}>Level 5 Director Tier</span>
            </div>

            <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Outstanding Loan</span>
              <div style={{ fontSize: '20px', fontWeight: '800', marginTop: '6px', color: 'var(--text-primary)', fontFamily: 'monospace' }}>₹95,000.00</div>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginTop: '4px' }}>EMI: ₹8,333.00 / month</span>
            </div>

            <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Witness Clearances</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
                <span style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 600 }}>Kumar (Vouched)</span>
                <span style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 600 }}>Sharma (Vouched)</span>
              </div>
              <span style={{ fontSize: '11px', color: '#60a5fa', display: 'block', marginTop: '6px', fontWeight: 500 }}>Requires 2 approvals</span>
            </div>
          </div>

          {/* Bottom ledger graph mock */}
          <div style={{ padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '12px', fontWeight: 500 }}>Recent Ledger Transactions (Tamper-Proof Chaining)</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontFamily: 'monospace', fontSize: '11px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#a7f3d0' }}>
                <span>[DEPOSIT] Rajesh Kumar - Contribution Jun 2026</span>
                <span>₹5,000.00 (TXN98234)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#93c5fd' }}>
                <span>[REPAYMENT] Amit Patel - Loan Repayment Jun 2026</span>
                <span>₹4,375.00 (TXN10294)</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section style={{
        padding: '60px 8%',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '32px'
        }}>
          
          <div className="glass-card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ color: 'var(--accent-primary)', background: 'rgba(16, 185, 129, 0.05)', padding: '10px', borderRadius: '8px', width: 'fit-content' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>Enterprise Security</h3>
            <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              Advanced JWT cookie cryptography, strict middleware permission check gates, and role-based workspace authorization.
            </p>
          </div>

          <div className="glass-card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ color: 'var(--accent-secondary)', background: 'rgba(99, 102, 241, 0.05)', padding: '10px', borderRadius: '8px', width: 'fit-content' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              </svg>
            </div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>Colleague Witnesses</h3>
            <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              Peer-to-peer accountability. Select colleagues as witnesses to co-sign and verify borrowing requests online.
            </p>
          </div>

          <div className="glass-card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ color: 'var(--accent-info)', background: 'rgba(59, 130, 246, 0.05)', padding: '10px', borderRadius: '8px', width: 'fit-content' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>Mock Gateway Simulator</h3>
            <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              Interact with simulated payment gateway checkouts (UPI, cards, NEFT) for deposits, disbursements, and EMI payments.
            </p>
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer style={{
        marginTop: '80px',
        padding: '32px 8%',
        borderTop: '1px solid var(--border-color)',
        textAlign: 'center',
        fontSize: '13px',
        color: 'var(--text-muted)'
      }}>
        <p style={{ margin: 0 }}>&copy; 2026 SocietyVault. Designed for organization cooperative compliance. All rights reserved.</p>
      </footer>

    </div>
  );
}
