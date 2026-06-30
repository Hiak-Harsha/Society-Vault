import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';

import { decrypt, decryptDeterministic, encrypt, encryptDeterministic, calculateTransactionHash } from '@/lib/security';
import { v4 as uuidv4 } from 'uuid';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const orgId = request.headers.get('x-user-org-id');
    const { id } = await params;

    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const loan = await prisma.loanApplication.findFirst({
      where: { id, orgId },
      include: {
        applicant: {
          select: {
            id: true,
            name: true,
            email: true,
            employeeId: true,
            rank: true,
            totalContributed: true,
            payGrade: true,
          },
        },
        witnesses: {
          include: {
            witness: {
              select: {
                id: true,
                name: true,
                employeeId: true,
                rank: true,
              },
            },
          },
        },
        repayments: {
          orderBy: { month: 'asc' },
        },
      },
    });

    if (!loan) {
      return NextResponse.json({ error: 'Loan application not found' }, { status: 404 });
    }

    const decryptedLoan = {
      ...loan,
      applicant: loan.applicant ? {
        ...loan.applicant,
        name: decrypt(loan.applicant.name),
        email: decryptDeterministic(loan.applicant.email),
        rank: loan.applicant.rank ? decrypt(loan.applicant.rank) : loan.applicant.rank
      } : null,
      witnesses: loan.witnesses.map(w => ({
        ...w,
        witness: w.witness ? {
          ...w.witness,
          name: decrypt(w.witness.name),
          rank: w.witness.rank ? decrypt(w.witness.rank) : w.witness.rank
        } : null
      }))
    };

    return NextResponse.json(decryptedLoan);
  } catch (error) {
    console.error('Get loan detail error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const orgId = request.headers.get('x-user-org-id');
    const actorId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');
    const { id } = await params;

    if (!orgId || !actorId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, reason } = body; // 'approve', 'reject', 'disburse'

    if (!['approve', 'reject', 'disburse'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const loan = await prisma.loanApplication.findFirst({
      where: { id, orgId },
    });

    if (!loan) {
      return NextResponse.json({ error: 'Loan application not found' }, { status: 404 });
    }

    const previousStatus = loan.status;

    if (action === 'approve') {
      if (!['ADMIN', 'TREASURER', 'SUPER_ADMIN'].includes(userRole || '')) {
        return NextResponse.json({ error: 'Only administrators or treasurers can approve loans' }, { status: 403 });
      }
      if (loan.status !== 'PENDING_APPROVAL') {
        return NextResponse.json({ error: 'Loan is not in PENDING_APPROVAL state' }, { status: 400 });
      }

      const updated = await prisma.loanApplication.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approvedBy: actorId,
          approvedAt: new Date(),
        },
      });

      await logAudit({
        orgId,
        actorId,
        action: 'LOAN_APPROVE',
        entityType: 'LoanApplication',
        entityId: id,
        previousState: { status: previousStatus },
        newState: { status: 'APPROVED', approvedBy: actorId },
      });

      return NextResponse.json(updated);
    }

    if (action === 'reject') {
      if (!['ADMIN', 'TREASURER', 'SUPER_ADMIN'].includes(userRole || '')) {
        return NextResponse.json({ error: 'Only administrators or treasurers can reject loans' }, { status: 403 });
      }
      if (!['PENDING_WITNESSES', 'PENDING_APPROVAL'].includes(loan.status)) {
        return NextResponse.json({ error: 'Only pending loans can be rejected' }, { status: 400 });
      }

      const updated = await prisma.loanApplication.update({
        where: { id },
        data: {
          status: 'REJECTED',
          rejectionReason: reason || 'Rejected by Administrator',
        },
      });

      await logAudit({
        orgId,
        actorId,
        action: 'LOAN_REJECT',
        entityType: 'LoanApplication',
        entityId: id,
        previousState: { status: previousStatus },
        newState: { status: 'REJECTED', reason },
      });

      return NextResponse.json(updated);
    }

    if (action === 'disburse') {
      if (!['ADMIN', 'TREASURER', 'SUPER_ADMIN'].includes(userRole || '')) {
        return NextResponse.json({ error: 'Only administrators or treasurers can disburse loans' }, { status: 403 });
      }
      if (loan.status !== 'APPROVED') {
        return NextResponse.json({ error: 'Only approved loans can be disbursed' }, { status: 400 });
      }

      // Perform disbursement transaction
      const updated = await prisma.$transaction(async (tx) => {
        // 1. Update loan status to REPAYING
        const updatedLoan = await tx.loanApplication.update({
          where: { id },
          data: {
            status: 'REPAYING',
            disbursedAt: new Date(),
          },
        });

        // 2. Adjust available fund balance in FundSummary
        await tx.fundSummary.update({
          where: { orgId },
          data: {
            totalDisbursed: { increment: loan.amount },
            availableBalance: { decrement: loan.amount },
            activeLoans: { increment: 1 },
          },
        });

        // 3. Create Transaction Ledger Entry with Cryptographic chaining
        const rawPaymentMethod = 'BANK_TRANSFER';
        const rawRefNum = `TXN${Math.floor(1000000000 + Math.random() * 9000000000)}`;

        // Fetch last transaction hash for chaining
        const lastTx = await tx.transaction.findFirst({
          where: { orgId },
          orderBy: { timestamp: 'desc' },
        });
        const previousHash = lastTx ? lastTx.hash : '';
        const txId = uuidv4();
        const timestamp = new Date();

        const hashVal = calculateTransactionHash({
          id: txId,
          orgId,
          type: 'WITHDRAWAL',
          amount: loan.amount,
          paymentMethod: rawPaymentMethod,
          referenceNumber: rawRefNum,
          timestamp,
          previousHash,
        });

        await tx.transaction.create({
          data: {
            id: txId,
            orgId,
            memberId: loan.applicantId,
            type: 'WITHDRAWAL',
            amount: loan.amount,
            paymentMethod: encrypt(rawPaymentMethod),
            referenceNumber: encryptDeterministic(rawRefNum),
            description: encrypt(`Loan disbursement for application ID ${loan.id.substring(0, 8)}`),
            timestamp,
            previousHash,
            hash: hashVal,
            status: 'COMPLETED',
          },
        });

        return updatedLoan;
      });

      await logAudit({
        orgId,
        actorId,
        action: 'LOAN_DISBURSE',
        entityType: 'LoanApplication',
        entityId: id,
        previousState: { status: previousStatus },
        newState: { status: 'REPAYING', disbursedAt: new Date() },
      });

      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: 'Invalid state transition' }, { status: 400 });
  } catch (error) {
    console.error('Update loan details error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
