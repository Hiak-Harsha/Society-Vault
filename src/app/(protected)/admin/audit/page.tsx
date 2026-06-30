'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { DataTable, Column } from '@/components/DataTable';
import { Modal } from '@/components/Modal';
import { formatDateTime } from '@/lib/utils';
import { useToast } from '@/components/Toast';

interface AuditLog {
  id: string;
  actorId: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  previousState: string | null;
  newState: string | null;
  ipAddress: string | null;
  timestamp: string;
  actor: {
    name: string;
    employeeId: string;
  } | null;
}

export default function AuditAdminPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const { showToast } = useToast();

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/audit');
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
      }
    } catch {
      showToast('Failed to fetch audit log trail', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLogs();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchLogs]);

  const handleRowClick = (row: AuditLog) => {
    setExpandedLogId(expandedLogId === row.id ? null : row.id);
  };

  const getActionBadgeColor = (action: string) => {
    const act = action.toUpperCase();
    if (['LOAN_APPLY', 'CONTRIBUTION'].includes(act)) return 'rgba(99, 102, 241, 0.15)'; // Indigo
    if (['LOAN_APPROVE', 'REPAYMENT'].includes(act)) return 'rgba(16, 185, 129, 0.15)'; // Emerald
    if (['LOAN_REJECT', 'MEMBER_DEACTIVATE'].includes(act)) return 'rgba(239, 68, 68, 0.15)'; // Red
    return 'rgba(255,255,255,0.05)';
  };

  const getActionTextColor = (action: string) => {
    const act = action.toUpperCase();
    if (['LOAN_APPLY', 'CONTRIBUTION'].includes(act)) return 'var(--accent-secondary)';
    if (['LOAN_APPROVE', 'REPAYMENT'].includes(act)) return 'var(--accent-primary)';
    if (['LOAN_REJECT', 'MEMBER_DEACTIVATE'].includes(act)) return 'var(--accent-danger)';
    return 'var(--text-secondary)';
  };

  const parseState = (stateStr: string | null) => {
    if (!stateStr) return null;
    try {
      return JSON.parse(stateStr);
    } catch {
      return stateStr;
    }
  };

  const handleExportCSV = () => {
    if (logs.length === 0) return;
    
    // Header
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Timestamp,Actor Name,Employee ID,Action,Entity,IP Address\n';
    
    // Rows
    logs.forEach(log => {
      const row = [
        formatDateTime(log.timestamp),
        log.actor?.name || 'System',
        log.actor?.employeeId || '-',
        log.action,
        `${log.entityType || ''} (${log.entityId || ''})`,
        log.ipAddress || '-'
      ].map(val => `"${val.replace(/"/g, '""')}"`).join(',');
      csvContent += row + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `society_audit_trail_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Audit trail exported successfully', 'success');
  };

  const columns: Column<AuditLog>[] = [
    {
      key: 'timestamp',
      label: 'Timestamp',
      sortable: true,
      render: (val) => formatDateTime(val),
    },
    {
      key: 'actor',
      label: 'Authorized Actor',
      sortable: true,
      render: (_, row) => row.actor ? (
        <div>
          <span style={{ fontWeight: '600' }}>{row.actor.name}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>ID: {row.actor.employeeId}</span>
        </div>
      ) : <span style={{ color: 'var(--text-muted)' }}>System Process</span>,
    },
    {
      key: 'action',
      label: 'Operation Action',
      sortable: true,
      render: (val) => (
        <span className="badge" style={{
          background: getActionBadgeColor(val),
          color: getActionTextColor(val),
          border: '1px solid rgba(255,255,255,0.02)',
          fontSize: '11px',
          padding: '4px 8px'
        }}>
          {val.replace('_', ' ')}
        </span>
      ),
    },
    {
      key: 'entityType',
      label: 'Impacted Entity',
      sortable: true,
      render: (_, row) => row.entityType ? (
        <div>
          <span style={{ fontWeight: '500' }}>{row.entityType}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>
            ID: {row.entityId ? row.entityId.substring(0, 8) : '-'}...
          </span>
        </div>
      ) : '-',
    },
    {
      key: 'ipAddress',
      label: 'Client IP Address',
      sortable: true,
      render: (val) => val || '-',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '4px' }}>
        <button 
          onClick={handleExportCSV} 
          className="btn btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          disabled={logs.length === 0}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export CSV
        </button>
      </div>

      <div className="glass-card" style={{ padding: '24px' }}>
        {loading ? (
          <div className="skeleton" style={{ height: '300px', borderRadius: '8px' }} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <DataTable
              columns={columns}
              data={logs}
              onRowClick={handleRowClick}
              emptyMessage="No audit logs recorded."
            />
            
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
              💡 Click on any log entry row to view details of the state changes.
            </span>
          </div>
        )}
      </div>

      {/* Expanded log details (Inline or Modal based) */}
      {expandedLogId && (
        (() => {
          const selectedLog = logs.find(l => l.id === expandedLogId);
          if (!selectedLog) return null;
          
          const prev = parseState(selectedLog.previousState);
          const next = parseState(selectedLog.newState);

          return (
            <Modal
              isOpen={!!expandedLogId}
              onClose={() => setExpandedLogId(null)}
              title="Audit Log details"
              size="lg"
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '16px' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Action Logged</span>
                    <p style={{ margin: '4px 0 0 0', fontWeight: '700' }}>{selectedLog.action}</p>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Authorized Actor</span>
                    <p style={{ margin: '4px 0 0 0', fontWeight: '700' }}>{selectedLog.actor?.name || 'System'}</p>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Timestamp</span>
                    <p style={{ margin: '4px 0 0 0', fontWeight: '700' }}>{formatDateTime(selectedLog.timestamp)}</p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                  <div>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>
                      Previous state
                    </span>
                    <pre style={{
                      background: '#070a13',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      padding: '16px',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      overflowX: 'auto',
                      color: 'var(--text-secondary)',
                      margin: 0,
                      maxHeight: '260px'
                    }}>
                      {prev ? JSON.stringify(prev, null, 2) : 'No previous state (Entity Created)'}
                    </pre>
                  </div>

                  <div>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>
                      New state
                    </span>
                    <pre style={{
                      background: '#070a13',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      padding: '16px',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      overflowX: 'auto',
                      color: 'var(--text-secondary)',
                      margin: 0,
                      maxHeight: '260px'
                    }}>
                      {next ? JSON.stringify(next, null, 2) : 'No state logged'}
                    </pre>
                  </div>
                </div>
              </div>
            </Modal>
          );
        })()
      )}
    </div>
  );
}
