import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

import { decryptTransaction } from '@/lib/security';

export async function GET(request: Request) {
  try {
    const orgId = request.headers.get('x-user-org-id');
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');

    if (!orgId || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || undefined;
    const memberId = searchParams.get('memberId') || undefined;
    const search = searchParams.get('search') || '';

    const whereClause: {
      orgId: string;
      type?: string;
      memberId?: string;
    } = {
      orgId,
    };

    if (type) {
      whereClause.type = type;
    }

    if (memberId) {
      whereClause.memberId = memberId;
    } else if (userRole === 'MEMBER' && !searchParams.has('all')) {
      whereClause.memberId = userId;
    }

    const transactions = await prisma.transaction.findMany({
      where: whereClause,
      include: {
        member: {
          select: {
            name: true,
            employeeId: true,
            email: true,
            rank: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
    });

    const decryptedTransactions = transactions.map(tx => decryptTransaction(tx));

    const filteredTransactions = search
      ? decryptedTransactions.filter(tx =>
          tx.referenceNumber.toLowerCase().includes(search.toLowerCase()) ||
          (tx.description && tx.description.toLowerCase().includes(search.toLowerCase())) ||
          (tx.member && tx.member.name.toLowerCase().includes(search.toLowerCase())) ||
          (tx.member && tx.member.employeeId.toLowerCase().includes(search.toLowerCase()))
        )
      : decryptedTransactions;

    return NextResponse.json(filteredTransactions);
  } catch (error) {
    console.error('List transactions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
