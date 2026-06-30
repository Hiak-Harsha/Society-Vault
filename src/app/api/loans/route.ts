import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { loanApplicationSchema } from '@/lib/validators';
import { logAudit } from '@/lib/audit';

import { decrypt } from '@/lib/security';

export async function GET(request: Request) {
  try {
    const orgId = request.headers.get('x-user-org-id');
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');

    if (!orgId || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const applicantId = searchParams.get('applicantId');
    const status = searchParams.get('status');
    const witnessId = searchParams.get('witnessId');
    const witnessStatus = searchParams.get('witnessStatus');

    const whereClause: {
      orgId: string;
      applicantId?: string;
      status?: string;
      witnesses?: {
        some: {
          witnessId: string;
          status?: string;
        };
      };
    } = { orgId };

    if (applicantId) {
      whereClause.applicantId = applicantId;
    } else if (userRole === 'MEMBER' && !searchParams.has('all') && !witnessId) {
      whereClause.applicantId = userId;
    }

    if (status) {
      whereClause.status = status;
    }

    if (witnessId) {
      whereClause.witnesses = {
        some: {
          witnessId,
          ...(witnessStatus ? { status: witnessStatus } : {}),
        },
      };
    }

    const loans = await prisma.loanApplication.findMany({
      where: whereClause,
      include: {
        applicant: {
          select: {
            id: true,
            name: true,
            employeeId: true,
            rank: true,
            autoDeductEnabled: true,
            bankAccountNumber: true,
          },
        },
        witnesses: {
          select: {
            id: true,
            witnessId: true,
            status: true,
            remarks: true,
            respondedAt: true,
            witness: {
              select: {
                name: true,
                employeeId: true,
              },
            },
          },
        },
        _count: {
          select: { witnesses: true },
        },
      },
      orderBy: { appliedAt: 'desc' },
    });

    const decryptedLoans = loans.map(loan => {
      const mappedWitnesses = loan.witnesses?.map(w => ({
        ...w,
        witness: {
          ...w.witness,
          name: decrypt(w.witness.name),
        },
      })) || [];

      return {
        ...loan,
        witnesses: mappedWitnesses,
        applicant: loan.applicant ? {
          id: loan.applicant.id,
          name: decrypt(loan.applicant.name),
          employeeId: loan.applicant.employeeId,
          rank: loan.applicant.rank ? decrypt(loan.applicant.rank) : loan.applicant.rank,
          hasBankAccount: !!loan.applicant.bankAccountNumber,
          autoDeductEnabled: loan.applicant.autoDeductEnabled,
        } : null,
      };
    });

    return NextResponse.json(decryptedLoans);
  } catch (error) {
    console.error('List loans error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const orgId = request.headers.get('x-user-org-id');
    const applicantId = request.headers.get('x-user-id');

    if (!orgId || !applicantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const result = loanApplicationSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid inputs', details: result.error.format() }, { status: 400 });
    }

    const { amount, purpose, category, tenureMonths, witnessIds } = result.data;

    // Get policy settings
    const policy = await prisma.orgPolicy.findUnique({
      where: { orgId },
    });

    if (!policy) {
      return NextResponse.json({ error: 'Organization policy not configured' }, { status: 400 });
    }

    // Get applicant details
    const applicant = await prisma.member.findFirst({
      where: { id: applicantId, orgId },
    });

    if (!applicant) {
      return NextResponse.json({ error: 'Applicant details not found' }, { status: 404 });
    }

    // 1. Verify available balance
    const fundSummary = await prisma.fundSummary.findUnique({
      where: { orgId },
    });
    if (!fundSummary || fundSummary.availableBalance < amount) {
      return NextResponse.json({ error: 'Insufficient available funds in the organization cooperative pool' }, { status: 400 });
    }

    // 2. Verify Loan Limit policies
    if (amount > policy.maxLoanAmount) {
      return NextResponse.json({ error: `Loan amount exceeds organization maximum limit of ${policy.maxLoanAmount}` }, { status: 400 });
    }

    // 3. Multiplier Cap Check: Max loan amount = 3x (or policy set) total contributed
    const multiplierCapLimit = applicant.totalContributed * policy.loanMultiplierCap;
    if (amount > multiplierCapLimit) {
      return NextResponse.json({ error: `Loan amount exceeds your multiplier limit. Maximum permitted based on your contribution (${applicant.totalContributed}) is ${multiplierCapLimit} (${policy.loanMultiplierCap}x)` }, { status: 400 });
    }

    // 4. Concurrent Loans check
    const activeLoans = await prisma.loanApplication.findMany({
      where: {
        applicantId,
        orgId,
        status: { in: ['REPAYING', 'DISBURSED', 'APPROVED'] },
      },
    });

    if (activeLoans.length >= policy.maxConcurrentLoans) {
      return NextResponse.json({ error: `You already have an active loan. Organization policy allows maximum ${policy.maxConcurrentLoans} concurrent loans.` }, { status: 400 });
    }

    // 5. Witness requirements check
    if (witnessIds.length < policy.minWitnesses) {
      return NextResponse.json({ error: `Minimum ${policy.minWitnesses} witnesses are required for a loan application` }, { status: 400 });
    }

    if (witnessIds.includes(applicantId)) {
      return NextResponse.json({ error: 'You cannot select yourself as a witness' }, { status: 400 });
    }

    // Create the loan and witness entries
    const loan = await prisma.$transaction(async (tx) => {
      const createdLoan = await tx.loanApplication.create({
        data: {
          applicantId,
          orgId,
          amount,
          purpose,
          category,
          tenureMonths,
          interestRate: policy.interestRate,
          status: 'PENDING_WITNESSES', // Starts here until witnesses respond
        },
      });

      for (const witnessId of witnessIds) {
        await tx.loanWitness.create({
          data: {
            loanId: createdLoan.id,
            witnessId,
            status: 'REQUESTED',
          },
        });
      }

      return createdLoan;
    });

    await logAudit({
      orgId,
      actorId: applicantId,
      action: 'LOAN_APPLY',
      entityType: 'LoanApplication',
      entityId: loan.id,
      newState: { amount, purpose, category, tenureMonths, witnessesCount: witnessIds.length, status: 'PENDING_WITNESSES' },
    });

    return NextResponse.json(loan, { status: 201 });
  } catch (error) {
    console.error('Apply loan error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
