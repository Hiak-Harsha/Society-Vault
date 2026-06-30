import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';

import { decrypt, decryptDeterministic, encrypt, encryptDeterministic, calculateTransactionHash } from '@/lib/security';
import { v4 as uuidv4 } from 'uuid';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const orgId = request.headers.get('x-user-org-id');
    const actorId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');
    const { id } = await params;

    if (!orgId || !actorId || !['ADMIN', 'TREASURER'].includes(userRole || '')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const repayment = await prisma.repayment.findFirst({
      where: { id },
      include: {
        loan: {
          include: {
            repayments: true,
          },
        },
      },
    });

    if (!repayment || repayment.loan.orgId !== orgId) {
      return NextResponse.json({ error: 'Repayment record not found' }, { status: 404 });
    }

    if (repayment.status !== 'PENDING') {
      return NextResponse.json({ error: 'Repayment has already been processed' }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Update repayment status to CONFIRMED
      const updatedRepayment = await tx.repayment.update({
        where: { id },
        data: {
          status: 'CONFIRMED',
          confirmedBy: actorId,
          confirmedAt: new Date(),
        },
      });

      // 2. Fetch all CONFIRMED repayments for this loan to check total paid
      const confirmedRepayments = await tx.repayment.findMany({
        where: {
          loanId: repayment.loanId,
          status: 'CONFIRMED',
        },
      });

      const totalPrincipalPaid = confirmedRepayments.reduce((sum, r) => sum + r.principalPortion, 0) + repayment.principalPortion;
      
      const isLoanFullyRepaid = totalPrincipalPaid >= repayment.loan.amount;

      // 3. Update LoanApplication status if fully repaid
      if (isLoanFullyRepaid) {
        await tx.loanApplication.update({
          where: { id: repayment.loanId },
          data: { status: 'CLOSED' },
        });
      }

      // 4. Update FundSummary (totalRepaid, availableBalance, activeLoans count)
      await tx.fundSummary.update({
        where: { orgId },
        data: {
          totalRepaid: { increment: repayment.amount },
          availableBalance: { increment: repayment.amount },
          activeLoans: isLoanFullyRepaid ? { decrement: 1 } : undefined,
        },
      });

      // 5. Create Transaction Ledger Entry with Chaining & Encryption
      const rawPaymentMethod = repayment.paymentMethod ? decrypt(repayment.paymentMethod) : 'SYSTEM';
      const rawRefNum = repayment.referenceNumber ? decryptDeterministic(repayment.referenceNumber) : `TXN${Math.floor(1000000000 + Math.random() * 9000000000)}`;

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
        type: 'REPAYMENT',
        amount: repayment.amount,
        paymentMethod: rawPaymentMethod,
        referenceNumber: rawRefNum,
        timestamp,
        previousHash,
      });

      await tx.transaction.create({
        data: {
          id: txId,
          orgId,
          memberId: repayment.loan.applicantId,
          type: 'REPAYMENT',
          amount: repayment.amount,
          paymentMethod: encrypt(rawPaymentMethod),
          referenceNumber: encryptDeterministic(rawRefNum),
          description: encrypt(`Loan repayment for month ${repayment.month}`),
          timestamp,
          previousHash,
          hash: hashVal,
          status: 'COMPLETED',
        },
      });

      return updatedRepayment;
    });

    await logAudit({
      orgId,
      actorId,
      action: 'REPAYMENT',
      entityType: 'Repayment',
      entityId: id,
      previousState: { status: 'PENDING' },
      newState: { status: 'CONFIRMED', confirmedBy: actorId },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Confirm repayment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
