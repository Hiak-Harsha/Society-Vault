import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const orgId = request.headers.get('x-user-org-id');

    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const fundSummary = await prisma.fundSummary.findUnique({
      where: { orgId },
    });

    if (!fundSummary) {
      // Return zeroed summary if not initialized for some reason
      return NextResponse.json({
        totalPool: 0,
        totalDisbursed: 0,
        totalRepaid: 0,
        availableBalance: 0,
        activeLoans: 0,
      });
    }

    return NextResponse.json(fundSummary);
  } catch (error) {
    console.error('Get fund summary error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
