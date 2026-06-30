import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';

import { v4 as uuidv4 } from 'uuid';
import { decrypt, decryptDeterministic, encrypt, encryptDeterministic, calculateTransactionHash } from '@/lib/security';

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

    const body = await request.json();
    const { action } = body; // 'confirm' or 'reject'

    if (!['confirm', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Choose confirm or reject' }, { status: 400 });
    }

    const contribution = await prisma.contribution.findFirst({
      where: { id, orgId },
      include: { member: true },
    });

    if (!contribution) {
      return NextResponse.json({ error: 'Contribution record not found' }, { status: 404 });
    }

    if (contribution.status !== 'PENDING') {
      return NextResponse.json({ error: 'Contribution has already been processed' }, { status: 400 });
    }

    const status = action === 'confirm' ? 'CONFIRMED' : 'REJECTED';

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Update contribution status
      const updatedContribution = await tx.contribution.update({
        where: { id },
        data: {
          status,
          confirmedBy: actorId,
          confirmedAt: new Date(),
        },
      });

      if (action === 'confirm') {
        // 2. Increment Member's total contribution
        await tx.member.update({
          where: { id: contribution.memberId },
          data: {
            totalContributed: {
              increment: contribution.amount,
            },
          },
        });

        // 3. Update FundSummary (totalPool and availableBalance)
        await tx.fundSummary.update({
          where: { orgId },
          data: {
            totalPool: {
              increment: contribution.amount,
            },
            availableBalance: {
              increment: contribution.amount,
            },
          },
        });

        // 4. Create Transaction Ledger Entry with Chaining & Encryption
        const rawPaymentMethod = contribution.paymentMethod ? decrypt(contribution.paymentMethod) : 'SYSTEM';
        const rawRefNum = contribution.referenceNumber ? decryptDeterministic(contribution.referenceNumber) : `TXN${Math.floor(1000000000 + Math.random() * 9000000000)}`;

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
          type: 'DEPOSIT',
          amount: contribution.amount,
          paymentMethod: rawPaymentMethod,
          referenceNumber: rawRefNum,
          timestamp,
          previousHash,
        });

        await tx.transaction.create({
          data: {
            id: txId,
            orgId,
            memberId: contribution.memberId,
            type: 'DEPOSIT',
            amount: contribution.amount,
            paymentMethod: encrypt(rawPaymentMethod),
            referenceNumber: encryptDeterministic(rawRefNum),
            description: encrypt(`Contribution for month ${contribution.month}`),
            timestamp,
            previousHash,
            hash: hashVal,
            status: 'COMPLETED',
          },
        });
      }

      return updatedContribution;
    });

    await logAudit({
      orgId,
      actorId,
      action: 'CONTRIBUTION',
      entityType: 'Contribution',
      entityId: id,
      previousState: { status: 'PENDING' },
      newState: { status, confirmedBy: actorId, amount: contribution.amount },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Confirm contribution error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
