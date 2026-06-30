import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

import { decryptMember } from '@/lib/security';

export async function GET(request: Request) {
  try {
    const userId = request.headers.get('x-user-id');
    const orgId = request.headers.get('x-user-org-id');

    if (!userId || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rawMember = await prisma.member.findFirst({
      where: { id: userId, orgId },
      include: {
        organization: { select: { name: true, code: true } },
        payGrade: true,
      },
    });

    if (!rawMember || !rawMember.isActive) {
      return NextResponse.json({ error: 'User not found or inactive' }, { status: 404 });
    }

    const member = decryptMember(rawMember);

    return NextResponse.json({
      id: member.id,
      name: member.name,
      email: member.email,
      role: member.role,
      employeeId: member.employeeId,
      rank: member.rank,
      totalContributed: member.totalContributed,
      orgName: member.organization.name,
      orgCode: member.organization.code,
      payGrade: member.payGrade,
    });
  } catch (error) {
    console.error('API /me error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
