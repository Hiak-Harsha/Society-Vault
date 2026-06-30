import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const orgId = request.headers.get('x-user-org-id');
    const userId = request.headers.get('x-user-id');
    if (!orgId || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Fetch personal details
    const member = await prisma.member.findUnique({
      where: { id: userId },
      select: {
        totalContributed: true,
      },
    });

    // 2. Fetch active loan statistics for user
    const personalActiveLoans = await prisma.loanApplication.findMany({
      where: {
        applicantId: userId,
        orgId,
        status: { in: ['REPAYING', 'DISBURSED', 'APPROVED'] },
      },
      select: {
        amount: true,
        repayments: {
          where: { status: 'CONFIRMED' },
          select: { principalPortion: true },
        },
      },
    });

    const activeLoansCount = personalActiveLoans.length;
    const activeLoanOutstanding = personalActiveLoans.reduce((total, loan) => {
      const repaid = loan.repayments.reduce((sum, r) => sum + r.principalPortion, 0);
      return total + (loan.amount - repaid);
    }, 0);

    // 3. Pending witness requests count
    const pendingWitnessRequests = await prisma.loanWitness.count({
      where: {
        witnessId: userId,
        status: 'REQUESTED',
        loan: {
          status: 'PENDING_WITNESSES',
        },
      },
    });

    // 4. Fund Summary
    const fundSummary = await prisma.fundSummary.findUnique({
      where: { orgId },
    });

    const totalMembers = await prisma.member.count({
      where: { orgId, isActive: true },
    });

    // 5. Recent Activity: last 10 audit logs with actor info
    const recentActivity = await prisma.auditLog.findMany({
      where: { orgId },
      include: {
        actor: {
          select: {
            name: true,
            employeeId: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: 10,
    });

    // 6. Grade distributions
    const memberGrades = await prisma.member.findMany({
      where: { orgId, isActive: true },
      select: {
        payGrade: {
          select: {
            gradeName: true,
          },
        },
      },
    });

    const gradeCounts: Record<string, number> = {};
    memberGrades.forEach(m => {
      const name = m.payGrade?.gradeName || 'Unassigned';
      gradeCounts[name] = (gradeCounts[name] || 0) + 1;
    });

    const membersByGrade = Object.entries(gradeCounts).map(([gradeName, count]) => ({
      gradeName,
      count,
    }));

    const { decrypt } = await import('@/lib/security');
    const decryptedActivity = recentActivity.map(log => {
      if (log.actor) {
        return {
          ...log,
          actor: {
            ...log.actor,
            name: decrypt(log.actor.name)
          }
        };
      }
      return log;
    });

    return NextResponse.json({
      personal: {
        totalContributed: member?.totalContributed || 0,
        activeLoansCount,
        activeLoanOutstanding,
        pendingWitnessRequests,
      },
      fundSummary: fundSummary ? {
        totalPool: fundSummary.totalPool,
        totalDisbursed: fundSummary.totalDisbursed,
        totalRepaid: fundSummary.totalRepaid,
        availableBalance: fundSummary.availableBalance,
        activeLoans: fundSummary.activeLoans,
        totalMembers,
      } : {
        totalPool: 0,
        totalDisbursed: 0,
        totalRepaid: 0,
        availableBalance: 0,
        activeLoans: 0,
        totalMembers,
      },
      membersByGrade,
      recentActivity: decryptedActivity,
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
