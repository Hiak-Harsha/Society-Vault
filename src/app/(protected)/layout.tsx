'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { ToastProvider } from '@/components/Toast';
import { WorkspaceProvider, useWorkspace } from '@/context/WorkspaceContext';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <WorkspaceProvider>
        <ProtectedLayoutContent>{children}</ProtectedLayoutContent>
      </WorkspaceProvider>
    </ToastProvider>
  );
}

function ProtectedLayoutContent({ children }: { children: React.ReactNode }) {
  const { currentUser, loadingUser } = useWorkspace();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loadingUser && !currentUser) {
      router.push('/login');
    }
  }, [currentUser, loadingUser, router]);

  const getPageTitle = () => {
    switch (pathname) {
      case '/dashboard': return 'Cooperative Overview';
      case '/contributions': return 'Monthly Contributions';
      case '/loans': return 'Loan Management';
      case '/loans/apply': return 'Apply for a Loan';
      case '/repayments': return 'Repayments Tracker';
      case '/transparency': return 'Transparency Ledger';
      case '/admin/members': return 'Cooperative Members';
      case '/admin/settings': return 'Policies & Settings';
      case '/admin/security': return 'Security Center';
      case '/admin/audit': return 'Security Audit Trail';
      case '/admin/reports': return 'Financial Reports';
      default:
        if (pathname.startsWith('/loans/')) return 'Loan Account Details';
        return 'SocietyVault Workspace';
    }
  };

  if (loadingUser) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0e1a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-muted)'
      }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <svg className="spin" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="2" x2="12" y2="6" />
            <line x1="12" y1="18" x2="12" y2="22" />
            <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
            <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
            <line x1="2" y1="12" x2="6" y2="12" />
            <line x1="18" y1="12" x2="22" y2="12" />
            <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
            <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
          </svg>
          <span style={{ fontSize: '13px', fontWeight: '500' }}>Loading Workspace...</span>
        </div>
      </div>
    );
  }

  if (!currentUser) return null;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Sidebar */}
      <Sidebar
        currentPath={pathname}
        userRole={currentUser.role}
        orgName={currentUser.orgName}
        userName={currentUser.name}
      />

      {/* Content Wrapper */}
      <div className="main-content-wrapper">
        <Header
          title={getPageTitle()}
          subtitle={currentUser.orgName}
          userName={currentUser.name}
          userRole={currentUser.role}
        />
        <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
