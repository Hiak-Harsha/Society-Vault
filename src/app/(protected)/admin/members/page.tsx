'use client';

import React, { useEffect, useState } from 'react';
import { DataTable, Column } from '@/components/DataTable';
import { StatusBadge } from '@/components/StatusBadge';
import { Modal } from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { useWorkspace } from '@/context/WorkspaceContext';
import { formatCurrency } from '@/lib/utils';

interface Member {
  id: string;
  name: string;
  email: string;
  employeeId: string;
  role: string;
  rank: string | null;
  totalContributed: number;
  isActive: boolean;
  payGradeId: string | null;
  payGrade?: {
    gradeName: string;
    monthlyContribution: number;
  } | null;
}

interface PayGradeOption {
  id: string;
  gradeName: string;
  level: number;
  monthlyContribution: number;
}

export default function MembersAdminPage() {
  const { members: cachedMembers, payGrades: cachedPayGrades, fetchMembers, fetchPayGrades } = useWorkspace();
  const members = cachedMembers as unknown as Member[];
  const payGrades = cachedPayGrades as unknown as PayGradeOption[];

  const [loading, setLoading] = useState(!cachedMembers || cachedMembers.length === 0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState('');

  const { showToast } = useToast();

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [role, setRole] = useState('MEMBER');
  const [payGradeId, setPayGradeId] = useState('');
  const [rank, setRank] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      // Async revalidation in the background
      await Promise.all([fetchMembers(), fetchPayGrades()]);
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
  }, [fetchMembers, fetchPayGrades]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      name,
      email,
      employeeId,
      role,
      payGradeId: payGradeId || null,
      rank,
      isActive,
    };

    try {
      const url = isEditMode ? `/api/members/${selectedMemberId}` : '/api/members';
      const method = isEditMode ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || 'Failed to save member', 'error');
      } else {
        showToast(`Member ${isEditMode ? 'updated' : 'registered'} successfully`, 'success');
        setIsModalOpen(false);
        resetForm();
        fetchMembers();
      }
    } catch {
      showToast('An error occurred. Please try again.', 'error');
    }
  };

  const handleEdit = (member: Member) => {
    setIsEditMode(true);
    setSelectedMemberId(member.id);
    setName(member.name);
    setEmail(member.email);
    setEmployeeId(member.employeeId);
    setRole(member.role);
    setPayGradeId(member.payGradeId || '');
    setRank(member.rank || '');
    setIsActive(member.isActive);
    setIsModalOpen(true);
  };

  const handleAddClick = () => {
    setIsEditMode(false);
    resetForm();
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setSelectedMemberId('');
    setName('');
    setEmail('');
    setEmployeeId('');
    setRole('MEMBER');
    setPayGradeId('');
    setRank('');
    setIsActive(true);
  };

  const columns: Column<Member>[] = [
    {
      key: 'name',
      label: 'Employee Name',
      sortable: true,
      render: (_, row) => (
        <div>
          <span style={{ fontWeight: '600' }}>{row.name}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>ID: {row.employeeId}</span>
        </div>
      ),
    },
    { key: 'email', label: 'Workspace Email', sortable: true },
    {
      key: 'payGrade',
      label: 'Pay Grade (EMI)',
      sortable: true,
      render: (_, row) => row.payGrade ? (
        <div>
          <span style={{ fontWeight: '500' }}>{row.payGrade.gradeName}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>
            Contribution: {formatCurrency(row.payGrade.monthlyContribution)}
          </span>
        </div>
      ) : <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>,
    },
    { key: 'rank', label: 'Designated Rank', sortable: true, render: (val) => val || '-' },
    {
      key: 'totalContributed',
      label: 'Accumulated Savings',
      sortable: true,
      render: (val) => formatCurrency(val),
    },
    {
      key: 'role',
      label: 'System Access',
      sortable: true,
      render: (val) => <span className="badge badge-neutral">{val}</span>,
    },
    {
      key: 'isActive',
      label: 'Account Status',
      sortable: true,
      render: (val) => <StatusBadge status={val ? 'ACTIVE' : 'INACTIVE'} />,
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (_, row) => (
        <button 
          onClick={(e) => { e.stopPropagation(); handleEdit(row); }}
          className="btn btn-ghost btn-sm"
          style={{ padding: '4px 8px', fontSize: '12px' }}
        >
          Edit
        </button>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '4px' }}>
        <button onClick={handleAddClick} className="btn btn-primary">
          Register Member
        </button>
      </div>

      <div className="glass-card">
        {loading ? (
          <div className="skeleton" style={{ height: '300px', borderRadius: '16px' }} />
        ) : (
          <DataTable
            columns={columns}
            data={members}
            searchable
            searchPlaceholder="Search members by name, email, or employee ID..."
            emptyMessage="No members registered."
          />
        )}
      </div>

      {/* Member Edit/Register Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditMode ? 'Edit Member details' : 'Register New Member'}
        footer={(
          <>
            <button onClick={() => setIsModalOpen(false)} className="btn btn-ghost">Cancel</button>
            <button type="submit" form="member-form" className="btn btn-primary">Save Member</button>
          </>
        )}
      >
        <form id="member-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div className="responsive-grid-2col" style={{ gap: '16px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="mem-name">Member Name</label>
              <input
                id="mem-name"
                type="text"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Full Name"
                disabled={isEditMode} // Disable editing names to maintain record integrity (update via admin if required)
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="mem-empId">Employee ID</label>
              <input
                id="mem-empId"
                type="text"
                className="input"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                required
                placeholder="e.g. EMP102"
                disabled={isEditMode}
              />
            </div>
          </div>

          <div className="responsive-grid-2col" style={{ gap: '16px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="mem-email">Email Address</label>
              <input
                id="mem-email"
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="colleague@org.com"
                disabled={isEditMode}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="mem-grade">Pay Grade Tier</label>
              <select
                id="mem-grade"
                className="select"
                value={payGradeId}
                onChange={(e) => setPayGradeId(e.target.value)}
                required
              >
                <option value="">Select Grade Tier...</option>
                {payGrades.map(g => (
                  <option key={g.id} value={g.id}>
                    {g.gradeName} (Level {g.level} | Contribution: {formatCurrency(g.monthlyContribution)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="responsive-grid-2col" style={{ gap: '16px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="mem-rank">Rank Designated</label>
              <input
                id="mem-rank"
                type="text"
                className="input"
                value={rank}
                onChange={(e) => setRank(e.target.value)}
                placeholder="e.g. Senior Officer"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="mem-role">Workspace Role</label>
              <select
                id="mem-role"
                className="select"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                required
              >
                <option value="MEMBER">Member (Standard Access)</option>
                <option value="TREASURER">Treasurer (Record access)</option>
                <option value="ADMIN">Administrator (Full Policy access)</option>
              </select>
            </div>
          </div>

          {isEditMode && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', margin: '4px 0' }}>
              <input 
                type="checkbox" 
                id="mem-active" 
                checked={isActive} 
                onChange={(e) => setIsActive(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <label htmlFor="mem-active" style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)', cursor: 'pointer' }}>
                Account Active & Enabled
              </label>
            </div>
          )}

          {!isEditMode && (
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Note: New accounts are automatically assigned password &apos;Welcome@123&apos;. Members must change it after logging in.
            </span>
          )}
        </form>
      </Modal>
    </div>
  );
}
