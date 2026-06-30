'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  employeeId: string;
  rank?: string | null;
  totalContributed: number;
  orgName: string;
  orgCode: string;
  payGrade?: {
    id: string;
    gradeName: string;
    level: number;
    monthlyContribution: number;
    description?: string | null;
  } | null;
}

export interface DashboardStats {
  totalPool: number;
  availableBalance: number;
  totalDisbursed: number;
  totalRepaid: number;
  activeLoans: number;
}

export interface ContributionRecord {
  id: string;
  memberId: string;
  amount: number;
  month: string;
  status: string;
  paidAt: string;
  paymentMethod?: string | null;
  referenceNumber?: string | null;
  member?: {
    name: string;
    employeeId: string;
  };
}

export interface LoanRecord {
  id: string;
  applicantId: string;
  amount: number;
  purpose: string;
  category: string;
  tenureMonths: number;
  interestRate: number;
  status: string;
  appliedAt: string;
  applicant?: {
    name: string;
    employeeId: string;
    rank?: string | null;
  } | null;
  witnesses?: {
    id: string;
    witnessId: string;
    status: string;
    remarks?: string | null;
    respondedAt?: string | null;
    witness: {
      name: string;
      employeeId: string;
    };
  }[];
}

export interface RepaymentRecord {
  id: string;
  loanId: string;
  amount: number;
  principalPortion: number;
  interestPortion: number;
  month: string;
  status: string;
  paidAt: string;
  loan?: {
    id: string;
    amount: number;
    applicant?: {
      name: string;
    } | null;
  } | null;
}

export interface TransactionRecord {
  id: string;
  type: string;
  amount: number;
  paymentMethod: string;
  referenceNumber: string;
  status: string;
  description?: string | null;
  timestamp: string;
  member?: {
    name: string;
    employeeId: string;
  } | null;
}

export interface MemberRecord {
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

export interface PayGradeRecord {
  id: string;
  gradeName: string;
  level: number;
  monthlyContribution: number;
  description?: string | null;
}

interface WorkspaceContextType {
  currentUser: UserProfile | null;
  dashboardData: DashboardStats | null;
  contributions: ContributionRecord[];
  loans: LoanRecord[];
  repayments: RepaymentRecord[];
  transactions: TransactionRecord[];
  members: MemberRecord[];
  payGrades: PayGradeRecord[];
  loadingUser: boolean;
  fetchUser: () => Promise<UserProfile | null>;
  fetchDashboard: () => Promise<void>;
  fetchContributions: () => Promise<void>;
  fetchLoans: () => Promise<void>;
  fetchRepayments: () => Promise<void>;
  fetchTransactions: () => Promise<void>;
  fetchMembers: () => Promise<void>;
  fetchPayGrades: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardStats | null>(null);
  const [contributions, setContributions] = useState<ContributionRecord[]>([]);
  const [loans, setLoans] = useState<LoanRecord[]>([]);
  const [repayments, setRepayments] = useState<RepaymentRecord[]>([]);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [payGrades, setPayGrades] = useState<PayGradeRecord[]>([]);
  const [loadingUser, setLoadingUser] = useState(true);

  const fetchUser = async (): Promise<UserProfile | null> => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data);
        return data;
      } else {
        setCurrentUser(null);
      }
    } catch (e) {
      console.error('Failed to fetch user context:', e);
      setCurrentUser(null);
    } finally {
      setLoadingUser(false);
    }
    return null;
  };

  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/dashboard/stats');
      if (res.ok) {
        setDashboardData(await res.json());
      }
    } catch (e) {
      console.error('Failed to pre-fetch dashboard metrics:', e);
    }
  };

  const fetchContributions = async () => {
    try {
      const res = await fetch('/api/contributions?all=true');
      if (res.ok) {
        setContributions(await res.json());
      }
    } catch (e) {
      console.error('Failed to pre-fetch contributions list:', e);
    }
  };

  const fetchMembers = async () => {
    try {
      const res = await fetch('/api/members');
      if (res.ok) {
        setMembers(await res.json());
      }
    } catch (e) {
      console.error('Failed to pre-fetch members list:', e);
    }
  };

  const fetchPayGrades = async () => {
    try {
      const res = await fetch('/api/org/pay-grades');
      if (res.ok) {
        setPayGrades(await res.json());
      }
    } catch (e) {
      console.error('Failed to pre-fetch pay grades:', e);
    }
  };

  const fetchLoans = async () => {
    try {
      const res = await fetch('/api/loans?all=true');
      if (res.ok) {
        setLoans(await res.json());
      }
    } catch (e) {
      console.error('Failed to pre-fetch loans list:', e);
    }
  };

  const fetchRepayments = async () => {
    try {
      const res = await fetch('/api/repayments?all=true');
      if (res.ok) {
        setRepayments(await res.json());
      }
    } catch (e) {
      console.error('Failed to pre-fetch repayments list:', e);
    }
  };

  const fetchTransactions = async () => {
    try {
      const res = await fetch('/api/transactions?all=true');
      if (res.ok) {
        setTransactions(await res.json());
      }
    } catch (e) {
      console.error('Failed to pre-fetch transactions list:', e);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const initializeWorkspace = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok && isMounted) {
          const user = await res.json();
          setCurrentUser(user);
          setLoadingUser(false);
          if (user) {
            // Fetch cached data in parallel
            await Promise.all([
              fetchDashboard(),
              fetchContributions(),
              fetchLoans(),
              fetchRepayments(),
              fetchTransactions(),
              fetchMembers(),
              fetchPayGrades(),
            ]);
          }
        } else if (isMounted) {
          setCurrentUser(null);
          setLoadingUser(false);
        }
      } catch (e) {
        console.error('Failed to initialize workspace:', e);
        if (isMounted) {
          setCurrentUser(null);
          setLoadingUser(false);
        }
      }
    };
    initializeWorkspace();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <WorkspaceContext.Provider value={{
      currentUser,
      dashboardData,
      contributions,
      loans,
      repayments,
      transactions,
      members,
      payGrades,
      loadingUser,
      fetchUser,
      fetchDashboard,
      fetchContributions,
      fetchLoans,
      fetchRepayments,
      fetchTransactions,
      fetchMembers,
      fetchPayGrades,
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};
