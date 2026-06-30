import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyLedger } from '@/lib/security';

export async function GET(request: Request) {
  try {
    const orgId = request.headers.get('x-user-org-id');
    const userRole = request.headers.get('x-user-role');

    if (!orgId || !['ADMIN', 'TREASURER', 'SUPER_ADMIN'].includes(userRole || '')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await verifyLedger(orgId);

    if (result.isValid) {
      await prisma.orgPolicy.update({
        where: { orgId },
        data: {
          ledgerVerifiedAt: new Date(),
        },
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    const err = error as Error;
    console.error('Ledger verification error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
