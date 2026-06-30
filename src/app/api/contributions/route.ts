import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { contributionSchema } from '@/lib/validators';
import { logAudit } from '@/lib/audit';
import crypto from 'crypto';

import { encrypt, encryptDeterministic, decryptContribution } from '@/lib/security';

export async function GET(request: Request) {
  try {
    const orgId = request.headers.get('x-user-org-id');
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');

    if (!orgId || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');
    const month = searchParams.get('month');
    const status = searchParams.get('status');

    const whereClause: {
      orgId: string;
      memberId?: string;
      month?: string;
      status?: string;
    } = { orgId };
    
    if (memberId) {
      whereClause.memberId = memberId;
    } else if (userRole === 'MEMBER' && !searchParams.has('all')) {
      whereClause.memberId = userId;
    }

    if (month) {
      whereClause.month = month;
    }
    if (status) {
      whereClause.status = status;
    }

    const contributions = await prisma.contribution.findMany({
      where: whereClause,
      include: {
        member: {
          select: {
            name: true,
            employeeId: true,
            payGrade: true,
            rank: true,
          },
        },
      },
      orderBy: { month: 'desc' },
    });

    // Decrypt contributions and associated member details in memory
    const decryptedContributions = contributions.map(c => decryptContribution(c));

    return NextResponse.json(decryptedContributions);
  } catch (error) {
    console.error('List contributions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const orgId = request.headers.get('x-user-org-id');
    const actorId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');

    if (!orgId || !actorId || !['ADMIN', 'TREASURER'].includes(userRole || '')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const result = contributionSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid inputs', details: result.error.format() }, { status: 400 });
    }

    const { memberId, amount, month, paymentMethod, referenceNumber, razorpayOrderId, razorpaySignature } = result.data;

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

    // Check if member belongs to same org
    const member = await prisma.member.findFirst({
      where: { id: memberId, orgId },
    });

    if (!member) {
      return NextResponse.json({ error: 'Member not found in this organization' }, { status: 404 });
    }

    // Check if contribution already exists for this month
    const existing = await prisma.contribution.findUnique({
      where: {
        memberId_month: { memberId, month },
      },
    });

    if (existing) {
      return NextResponse.json({ error: `Contribution already recorded for month ${month}` }, { status: 409 });
    }

    const rawContribution = await prisma.contribution.create({
      data: {
        orgId,
        memberId,
        amount,
        month,
        status: 'PENDING', // Initially pending until confirmed by admin/treasurer
        paymentMethod: paymentMethod ? encrypt(paymentMethod) : null,
        referenceNumber: referenceNumber ? encryptDeterministic(referenceNumber) : null,
      },
      include: {
        member: {
          select: { name: true, employeeId: true },
        },
      },
    });

    const contribution = decryptContribution(rawContribution);

    await logAudit({
      orgId,
      actorId,
      action: 'CONTRIBUTION',
      entityType: 'Contribution',
      entityId: contribution.id,
      newState: { memberName: contribution.member.name, amount, month, status: 'PENDING', paymentMethod, referenceNumber },
    });

    return NextResponse.json(contribution, { status: 201 });
  } catch (error) {
    console.error('Create contribution error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
