import { v4 as uuidv4 } from 'uuid';

// ─── Currency & Number Formatting ───────────────────────────────────────────

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCurrency(amount: number): string {
  return inrFormatter.format(amount);
}

// ─── Date Formatting ────────────────────────────────────────────────────────

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function getMonthString(date?: Date): string {
  const d = date ?? new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

// ─── Status Helpers ─────────────────────────────────────────────────────────

export function getStatusColor(status: string): string {
  const normalized = status.toUpperCase();

  const statusMap: Record<string, string> = {
    // Positive / Success
    APPROVED: 'status-success',
    CONFIRMED: 'status-success',
    ACCEPTED: 'status-success',
    DISBURSED: 'status-success',
    CLOSED: 'status-success',
    ACTIVE: 'status-success',

    // Warning / Pending
    PENDING: 'status-warning',
    PENDING_WITNESSES: 'status-warning',
    PENDING_APPROVAL: 'status-warning',
    DRAFT: 'status-warning',
    REQUESTED: 'status-warning',
    REPAYING: 'status-warning',

    // Error / Negative
    REJECTED: 'status-error',
    DECLINED: 'status-error',
    INACTIVE: 'status-error',
  };

  return statusMap[normalized] ?? 'status-default';
}

// ─── Financial Calculations ─────────────────────────────────────────────────

/**
 * Calculate Equated Monthly Installment (EMI).
 * Uses the standard reducing-balance formula:
 *   EMI = P × r × (1+r)^n / ((1+r)^n – 1)
 *
 * @param principal - Loan principal amount
 * @param rate      - Annual interest rate as a percentage (e.g., 12 for 12%)
 * @param months    - Loan tenure in months
 * @returns Monthly EMI amount rounded to 2 decimal places
 */
export function calculateEMI(
  principal: number,
  rate: number,
  months: number
): number {
  if (months <= 0) return 0;

  // If zero interest, simple division
  if (rate === 0) {
    return Math.round((principal / months) * 100) / 100;
  }

  const monthlyRate = rate / 12 / 100;
  const compoundFactor = Math.pow(1 + monthlyRate, months);
  const emi = (principal * monthlyRate * compoundFactor) / (compoundFactor - 1);

  return Math.round(emi * 100) / 100;
}

// ─── General Utilities ──────────────────────────────────────────────────────

export function generateId(): string {
  return uuidv4();
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + '…';
}

/**
 * Merge CSS class names, filtering out falsy values.
 * Lightweight alternative to clsx/classnames.
 */
export function cn(
  ...classes: (string | undefined | null | false)[]
): string {
  return classes.filter(Boolean).join(' ');
}
