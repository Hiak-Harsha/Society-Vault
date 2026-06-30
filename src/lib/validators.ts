import { z } from 'zod';

// ─── Auth Schemas ───────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters'),
});

export const registerOrgSchema = z.object({
  orgName: z
    .string()
    .min(2, 'Organization name must be at least 2 characters'),
  orgCode: z
    .string()
    .min(2, 'Organization code must be at least 2 characters')
    .max(10, 'Organization code must be at most 10 characters')
    .toUpperCase(),
  adminName: z
    .string()
    .min(2, 'Admin name must be at least 2 characters'),
  adminEmail: z
    .string()
    .min(1, 'Admin email is required')
    .email('Invalid email address'),
  adminPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters'),
  adminEmployeeId: z
    .string()
    .min(1, 'Employee ID is required'),
});

// ─── Member Schemas ─────────────────────────────────────────────────────────

export const addMemberSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required'),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address'),
  employeeId: z
    .string()
    .min(1, 'Employee ID is required'),
  role: z.enum(['MEMBER', 'ADMIN', 'TREASURER', 'SUPER_ADMIN'], {
    error: 'Invalid role',
  }),
  payGradeId: z
    .string()
    .min(1, 'Pay grade is required'),
  rank: z
    .string()
    .optional(),
});

// ─── Contribution Schemas ───────────────────────────────────────────────────

export const contributionSchema = z.object({
  memberId: z
    .string()
    .min(1, 'Member ID is required'),
  amount: z
    .number()
    .positive('Amount must be a positive number'),
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Month must be in YYYY-MM format'),
  paymentMethod: z.string().optional(),
  referenceNumber: z.string().optional(),
  razorpayOrderId: z.string().optional(),
  razorpaySignature: z.string().optional(),
});

// ─── Loan Schemas ───────────────────────────────────────────────────────────

export const loanApplicationSchema = z.object({
  amount: z
    .number()
    .positive('Loan amount must be a positive number'),
  purpose: z
    .string()
    .min(10, 'Purpose must be at least 10 characters'),
  category: z.enum(
    ['EMERGENCY', 'EDUCATION', 'MEDICAL', 'HOUSING', 'PERSONAL', 'OTHER'],
    { error: 'Invalid loan category' }
  ),
  tenureMonths: z
    .number()
    .int('Tenure must be a whole number')
    .min(1, 'Tenure must be at least 1 month')
    .max(120, 'Tenure cannot exceed 120 months'),
  witnessIds: z
    .array(z.string().min(1, 'Witness ID cannot be empty'))
    .min(1, 'At least one witness is required'),
});

export const loanWitnessResponseSchema = z.object({
  status: z.enum(['ACCEPTED', 'DECLINED'], {
    error: 'Status must be ACCEPTED or DECLINED',
  }),
  remarks: z
    .string()
    .optional(),
});

// ─── Repayment Schemas ──────────────────────────────────────────────────────

export const repaymentSchema = z.object({
  loanId: z
    .string()
    .min(1, 'Loan ID is required'),
  amount: z
    .number()
    .positive('Amount must be a positive number'),
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Month must be in YYYY-MM format'),
  paymentMethod: z.string().optional(),
  referenceNumber: z.string().optional(),
  razorpayOrderId: z.string().optional(),
  razorpaySignature: z.string().optional(),
});

// ─── Organization Policy Schemas ────────────────────────────────────────────

export const orgPolicySchema = z.object({
  interestModel: z.enum(['NONE', 'FLAT', 'REDUCING'], {
    error: 'Invalid interest model',
  }),
  interestRate: z
    .number()
    .min(0, 'Interest rate cannot be negative')
    .max(100, 'Interest rate cannot exceed 100%'),
  maxLoanAmount: z
    .number()
    .positive('Max loan amount must be positive'),
  loanMultiplierCap: z
    .number()
    .positive('Loan multiplier cap must be positive'),
  maxTenureMonths: z
    .number()
    .int()
    .min(1, 'Max tenure must be at least 1 month')
    .max(360, 'Max tenure cannot exceed 360 months'),
  minWitnesses: z
    .number()
    .int()
    .min(0, 'Minimum witnesses cannot be negative'),
  minWitnessApprovals: z
    .number()
    .int()
    .min(0, 'Minimum witness approvals cannot be negative'),
  approvalMode: z.enum(['ADMIN_ONLY', 'ADMIN_AND_WITNESSES', 'COMMITTEE'], {
    error: 'Invalid approval mode',
  }),
  repaymentMode: z.enum(['MANUAL', 'AUTO_DEDUCT', 'EMI_SCHEDULE'], {
    error: 'Invalid repayment mode',
  }),
  coolingPeriodDays: z
    .number()
    .int()
    .min(0, 'Cooling period cannot be negative'),
  maxConcurrentLoans: z
    .number()
    .int()
    .min(1, 'Max concurrent loans must be at least 1'),
});

// ─── Pay Grade Tier Schemas ─────────────────────────────────────────────────

export const payGradeTierSchema = z.object({
  gradeName: z
    .string()
    .min(1, 'Grade name is required'),
  level: z
    .number()
    .int('Level must be a whole number')
    .positive('Level must be a positive number'),
  monthlyContribution: z
    .number()
    .positive('Monthly contribution must be a positive number'),
  description: z
    .string()
    .optional(),
});

// ─── Inferred Types ─────────────────────────────────────────────────────────

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterOrgInput = z.infer<typeof registerOrgSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
export type ContributionInput = z.infer<typeof contributionSchema>;
export type LoanApplicationInput = z.infer<typeof loanApplicationSchema>;
export type LoanWitnessResponseInput = z.infer<typeof loanWitnessResponseSchema>;
export type RepaymentInput = z.infer<typeof repaymentSchema>;
export type OrgPolicyInput = z.infer<typeof orgPolicySchema>;
export type PayGradeTierInput = z.infer<typeof payGradeTierSchema>;
