import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { repaymentSchema } from '@/lib/validators';
import { logAudit } from '@/lib/audit';
import crypto from 'crypto';

import { encrypt, encryptDeterministic, decryptRepayment } from '@/lib/security';

export async function GET(request: Request) {
  try {
    const orgId = request.headers.get('x-user-org-id');
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');

    if (!orgId || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const loanId = searchParams.get('loanId');

    const whereClause: {
      loanId?: string;
      loan: {
        orgId: string;
        applicantId?: string;
      };
    } = {
      loan: {
        orgId,
      },
    };

    if (loanId) {
      whereClause.loanId = loanId;
    } else if (userRole === 'MEMBER' && !searchParams.has('all')) {
      whereClause.loan = {
        applicantId: userId,
        orgId,
      };
    }

    const repayments = await prisma.repayment.findMany({
      where: whereClause,
      include: {
        loan: {
          include: {
            applicant: {
              select: {
                name: true,
                employeeId: true,
              },
            },
          },
        },
      },
      orderBy: { paidAt: 'desc' },
    });

    const decryptedRepayments = repayments.map(r => decryptRepayment(r));

    return NextResponse.json(decryptedRepayments);
  } catch (error) {
    console.error('List repayments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const orgId = request.headers.get('x-user-org-id');
    const actorId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');

    if (!orgId || !actorId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const result = repaymentSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid inputs', details: result.error.format() }, { status: 400 });
    }

    const { loanId, amount, month, paymentMethod, referenceNumber, razorpayOrderId, razorpaySignature } = result.data;

    // Verify Razorpay signature if this is a Razorpay payment
    const razorpaySecret = process.env.RAZORPAY_KEY_SECRET;
    if (paymentMethod === 'RAZORPAY' && razorpaySecret && razorpayOrderId && razorpaySignature) {
      const expectedSignature = crypto
        .createHmac('sha256', razorpaySecret)
        .update(`${razorpayOrderId}|${referenceNumber}`)
        .digest('hex');
      if (expectedSignature !== razorpaySignature) {
        return NextResponse.json({ error: 'Payment signature verification failed. Transaction rejected.' }, { status: 400 });
      }
    }

    // Verify loan exists in this org
    const loan = await prisma.loanApplication.findFirst({
      where: { id: loanId, orgId },
      include: {
        repayments: true,
      },
    });

    if (!loan) {
      return NextResponse.json({ error: 'Loan record not found' }, { status: 404 });
    }

    if (userRole === 'MEMBER' && loan.applicantId !== actorId) {
      return NextResponse.json({ error: 'Unauthorized: You can only record repayments for your own loans' }, { status: 403 });
    }

    if (loan.status !== 'REPAYING') {
      return NextResponse.json({ error: 'Repayments can only be recorded for loans currently in REPAYING status' }, { status: 400 });
    }

    // Verify if repayment already recorded for this month
    const monthExists = loan.repayments.some(r => r.month === month);
    if (monthExists) {
      return NextResponse.json({ error: `Repayment already recorded for month ${month}` }, { status: 409 });
    }

    // Calculate interest vs principal portion based on org policy
    const policy = await prisma.orgPolicy.findUnique({ where: { orgId } });
    
    let interestPortion = 0;
    if (policy && policy.interestModel !== 'NONE' && policy.interestRate > 0) {
      interestPortion = Math.round((loan.amount * (policy.interestRate / 100)) / loan.tenureMonths);
    }
    
    // Ensure interest portion does not exceed the total paid amount
    if (interestPortion > amount) {
      interestPortion = amount;
    }
    const principalPortion = amount - interestPortion;

    // Save repayment and update balances
    const rawRepayment = await prisma.$transaction(async (tx) => {
      // 1. Create Repayment entry (PENDING by default until confirmed)
      const createdRepayment = await tx.repayment.create({
        data: {
          loanId,
          amount,
          principalPortion,
          interestPortion,
          month,
          status: 'PENDING',
          paymentMethod: paymentMethod ? encrypt(paymentMethod) : null,
          referenceNumber: referenceNumber ? encryptDeterministic(referenceNumber) : null,
        },
      });

      return createdRepayment;
    });

    const repayment = decryptRepayment(rawRepayment);

    await logAudit({
      orgId,
      actorId,
      action: 'REPAYMENT',
      entityType: 'Repayment',
      entityId: repayment.id,
      newState: { amount, principalPortion, interestPortion, month, status: 'PENDING', paymentMethod, referenceNumber },
    });

    return NextResponse.json(repayment, { status: 201 });
  } catch (error) {
    console.error('Record repayment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
