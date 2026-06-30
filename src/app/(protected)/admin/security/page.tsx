'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/Toast';

interface SyncRecord {
  employeeId: string;
  name: string;
  action: 'CREATED' | 'UPDATED';
}

export default function SecurityCenterPage() {
  const { showToast } = useToast();
  
  // Ledger States
  const [ledgerStatus, setLedgerStatus] = useState<{
    isValid: boolean;
    message: string;
    checkedCount?: number;
    lastVerified?: string;
  } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Sync Settings States
  const [directoryType, setDirectoryType] = useState('NONE');
  const [directoryEndpoint, setDirectoryEndpoint] = useState('');
  const [directoryApiKey, setDirectoryApiKey] = useState('');
  const [directoryMapping, setDirectoryMapping] = useState('{"employeeId":"id","name":"fullName","email":"mail","rank":"jobTitle"}');
  const [ipWhitelist, setIpWhitelist] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Sync Trigger States
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    message: string;
    records: SyncRecord[];
  } | null>(null);

  // Fetch initial config
  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/sync/config');
      if (res.ok) {
        const data = await res.json();
        setDirectoryType(data.directoryType || 'NONE');
        setDirectoryEndpoint(data.directoryEndpoint || '');
        setDirectoryApiKey(data.directoryApiKey || '');
        setIpWhitelist(data.ipWhitelist || '');
        if (data.directoryMapping) {
          try {
            setDirectoryMapping(
              typeof data.directoryMapping === 'string'
                ? data.directoryMapping
                : JSON.stringify(data.directoryMapping, null, 2)
            );
          } catch {
            setDirectoryMapping(data.directoryMapping);
          }
        }
      }
    } catch {
      showToast('Failed to load security configurations', 'error');
    }
  }, [showToast]);

  // Run initial verification
  const verifyLedgerIntegrity = useCallback(async (quiet = false) => {
    setIsVerifying(true);
    try {
      const res = await fetch('/api/admin/ledger/verify');
      const data = await res.json();
      if (res.ok && data.isValid) {
        setLedgerStatus({
          isValid: true,
          message: data.message,
          lastVerified: new Date().toLocaleTimeString(),
        });
        if (!quiet) showToast('Cryptographic ledger verified successfully', 'success');
      } else {
        setLedgerStatus({
          isValid: false,
          message: data.message || 'Tampering detected in ledger chain links',
        });
        showToast(data.message || 'WARNING: Ledger integrity check failed!', 'warning');
      }
    } catch {
      setLedgerStatus({
        isValid: false,
        message: 'Failed to complete cryptographic verification check',
      });
      if (!quiet) showToast('Verification service error', 'error');
    } finally {
      setIsVerifying(false);
    }
  }, [showToast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchConfig();
      verifyLedgerIntegrity(true);
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchConfig, verifyLedgerIntegrity]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      let parsedMapping = null;
      if (directoryMapping.trim()) {
        try {
          parsedMapping = JSON.parse(directoryMapping);
        } catch {
          showToast('Invalid JSON in Directory Attribute Mapping', 'error');
          setIsSavingSettings(false);
          return;
        }
      }

      const res = await fetch('/api/admin/sync/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          directoryType,
          directoryEndpoint,
          directoryApiKey,
          directoryMapping: parsedMapping,
          ipWhitelist,
        }),
      });

      if (res.ok) {
        showToast('Security policy and directory config saved', 'success');
        fetchConfig();
      } else {
        const errorData = await res.json();
        showToast(errorData.error || 'Failed to save settings', 'error');
      }
    } catch {
      showToast('Error saving configurations', 'error');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/admin/sync', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message, 'success');
        setSyncResult({
          message: data.message,
          records: data.records || [],
        });
        // Re-verify ledger after sync since sync creates member log audits
        verifyLedgerIntegrity(true);
      } else {
        showToast(data.error || 'Sync failed', 'error');
      }
    } catch {
      showToast('Connection to sync endpoint failed', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px' }}>
      <div className="page-header">
        <h1 className="page-title text-gradient">Security & Integrations Center</h1>
        <p className="page-subtitle">Configure enterprise-grade security middleware, IP whitelists, and universal employee directory connectors.</p>
      </div>

      {/* Grid: Ledger Health & IP Whitelist */}
      <div className="grid-2">
        {/* Card: Cryptographic Ledger Chain */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
              Cryptographic Transaction Ledger
            </h3>
            {ledgerStatus && (
              <span className={`badge ${ledgerStatus.isValid ? 'badge-success' : 'badge-danger'}`}>
                {ledgerStatus.isValid ? 'Ledger Secured' : 'Tampered / Broken'}
              </span>
            )}
          </div>

          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0, lineHeight: '1.5' }}>
            All platform transactions (deposits, repayments, withdrawals) are cryptographically signed and sequenced in a SHA-256 blockchain. Any direct database edits bypass this and break the verification hash chain immediately.
          </p>

          <div style={{
            background: 'rgba(0,0,0,0.25)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '16px',
            fontSize: '13px',
            fontFamily: 'monospace',
            color: ledgerStatus?.isValid ? '#a7f3d0' : '#fca5a5'
          }}>
            <strong>Ledger Status:</strong> {ledgerStatus ? ledgerStatus.message : 'Unchecked'}
            {ledgerStatus?.lastVerified && (
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Last verified at: {ledgerStatus.lastVerified}
              </div>
            )}
          </div>

          {/* Blockchain Node Animation Visualizer */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', padding: '8px 0' }}>
            {[1, 2, 3, 4].map((nodeIdx) => (
              <React.Fragment key={nodeIdx}>
                <div style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${ledgerStatus?.isValid ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                  borderRadius: '6px',
                  padding: '8px 12px',
                  minWidth: '100px',
                  textAlign: 'center',
                  fontSize: '11px',
                  boxShadow: ledgerStatus?.isValid ? '0 0 10px rgba(16, 185, 129, 0.05)' : 'none'
                }}>
                  <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>Block #{nodeIdx}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '9px', marginTop: '2px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {nodeIdx === 1 ? 'GENESIS_BLOCK' : `TXN_LINK_0${nodeIdx}`}
                  </div>
                  <div style={{ color: 'var(--accent-primary)', fontSize: '8px', fontFamily: 'monospace', marginTop: '4px' }}>
                    SHA256: 7f8a...{nodeIdx}ae
                  </div>
                </div>
                {nodeIdx < 4 && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={ledgerStatus?.isValid ? 'var(--accent-primary)' : 'var(--accent-danger)'} strokeWidth="2">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                )}
              </React.Fragment>
            ))}
          </div>

          <button 
            className="btn btn-primary" 
            style={{ width: '100%', marginTop: 'auto' }} 
            onClick={() => verifyLedgerIntegrity(false)}
            disabled={isVerifying}
          >
            {isVerifying ? 'Verifying Ledger Chain...' : 'Verify Cryptographic Ledger Now'}
          </button>
        </div>

        {/* Card: IP Whitelist Settings */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent-secondary)" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Intranet IP Access Whitelisting
          </h3>

          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0, lineHeight: '1.5' }}>
            Restrict SocietyVault access to your organization&apos;s corporate intranet network or company VPN blocks. Enter comma-separated IP addresses or CIDR subnets (e.g. <code>192.168.1.0/24</code>). Leave blank to allow open access.
          </p>

          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label" htmlFor="ipWhitelistInput">Allowed IP Subnet Blocks (CIDR)</label>
            <textarea
              id="ipWhitelistInput"
              className="textarea"
              style={{ height: '80px', fontFamily: 'monospace', fontSize: '13px' }}
              value={ipWhitelist}
              onChange={(e) => setIpWhitelist(e.target.value)}
              placeholder="e.g. 127.0.0.1, 10.0.0.0/8, 172.16.1.10"
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', color: 'var(--text-muted)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span>Your current client IP is evaluated dynamically by security middleware.</span>
          </div>

          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={handleSaveSettings}
            disabled={isSavingSettings}
            style={{ width: '100%' }}
          >
            {isSavingSettings ? 'Saving Whitelist...' : 'Save Whitelist Rules'}
          </button>
        </div>
      </div>

      {/* Card: Universal Directory Sync Settings */}
      <div className="glass-card">
        <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent-info)" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          Universal Directory Sync Connector
        </h3>

        <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="grid-3">
            <div className="form-group">
              <label className="form-label" htmlFor="dirType">Connector Directory Type</label>
              <select 
                id="dirType" 
                className="select" 
                value={directoryType} 
                onChange={(e) => setDirectoryType(e.target.value)}
              >
                <option value="NONE">No Integration (Manual Import)</option>
                <option value="LDAP">Active Directory / LDAP Server</option>
                <option value="REST_API">Corporate HRMS REST API</option>
                <option value="SQL_DB">Employee Database SQL staging</option>
              </select>
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label" htmlFor="dirEndpoint">Connection Endpoint / Database URI</label>
              <input 
                id="dirEndpoint" 
                type="text" 
                className="input" 
                value={directoryEndpoint}
                onChange={(e) => setDirectoryEndpoint(e.target.value)}
                placeholder={directoryType === 'LDAP' ? 'ldap://ad.bank.corp:389' : directoryType === 'REST_API' ? 'https://hrms.bank.com/api/v1/employees' : 'postgresql://user:pass@localhost:5432/hrms_db'}
                disabled={directoryType === 'NONE'}
              />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label" htmlFor="dirKey">Security Credentials / API Auth Key</label>
              <input 
                id="dirKey" 
                type="password" 
                className="input" 
                value={directoryApiKey}
                onChange={(e) => setDirectoryApiKey(e.target.value)}
                placeholder="••••••••••••••••••••••••"
                disabled={directoryType === 'NONE'}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="dirMapping">Attribute Field Mapping Schema (JSON)</label>
              <input 
                id="dirMapping" 
                type="text" 
                className="input" 
                style={{ fontFamily: 'monospace', fontSize: '13px' }}
                value={directoryMapping}
                onChange={(e) => setDirectoryMapping(e.target.value)}
                placeholder='{"employeeId":"id","name":"fullName"}'
                disabled={directoryType === 'NONE'}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ flex: 1 }}
              disabled={isSavingSettings}
            >
              {isSavingSettings ? 'Saving configurations...' : 'Save Connector Configurations'}
            </button>

            {directoryType !== 'NONE' && (
              <button 
                type="button" 
                className="btn btn-ghost" 
                style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', color: '#60a5fa' }}
                onClick={handleSyncNow}
                disabled={isSyncing}
              >
                {isSyncing ? 'Syncing...' : 'Sync & Pull Profiles Now'}
              </button>
            )}
          </div>
        </form>

        {/* Sync Progress Logs */}
        {isSyncing && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '24px', alignItems: 'center', padding: '24px', background: 'rgba(0,0,0,0.15)', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.1)' }}>
            <div className="status-dot" style={{ background: 'var(--accent-info)' }} />
            <span style={{ fontSize: '14px', fontWeight: 'bold' }}>Executing Remote Directory Fetch...</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Validating API key signature and parsing employee registry.</span>
          </div>
        )}

        {syncResult && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '24px', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <h4 style={{ margin: 0, fontSize: '14px', color: 'var(--text-primary)' }}>Sync Summary Results</h4>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>{syncResult.message}</p>
            
            {syncResult.records.length > 0 && (
              <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', marginTop: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: 'rgba(0,0,0,0.3)', textAlign: 'left' }}>
                      <th style={{ padding: '8px' }}>Employee ID</th>
                      <th style={{ padding: '8px' }}>Name</th>
                      <th style={{ padding: '8px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {syncResult.records.map((rec, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '8px' }}>{rec.employeeId}</td>
                        <td style={{ padding: '8px' }}>{rec.name}</td>
                        <td style={{ padding: '8px' }}>
                          <span style={{ 
                            color: rec.action === 'CREATED' ? 'var(--accent-primary)' : 'var(--accent-info)',
                            fontWeight: 'bold'
                          }}>
                            {rec.action}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
