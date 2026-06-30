import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';

import { encrypt, decryptMember } from '@/lib/security';

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

    const rawMember = await prisma.member.findFirst({
      where: { id, orgId },
      include: {
        payGrade: true,
      },
    });

    if (!rawMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const member = decryptMember(rawMember);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...safeMember } = member;
    return NextResponse.json(safeMember);
  } catch (error) {
    console.error('Get member error:', error);
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

    if (!orgId || !actorId || !['ADMIN', 'TREASURER'].includes(userRole || '')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { role, payGradeId, rank, isActive } = body;

    const rawExistingMember = await prisma.member.findFirst({
      where: { id, orgId },
    });

    if (!rawExistingMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const existingMember = decryptMember(rawExistingMember);

    // Only Admin can edit roles or status
    if (userRole !== 'ADMIN' && (role !== undefined || isActive !== undefined)) {
      return NextResponse.json({ error: 'Unauthorized: Only Admin can update role or status' }, { status: 403 });
    }

    // Validate pay grade if updating
    if (payGradeId) {
      const payGrade = await prisma.payGradeTier.findFirst({
        where: { id: payGradeId, orgId },
      });
      if (!payGrade) {
        return NextResponse.json({ error: 'Invalid Pay Grade selected' }, { status: 400 });
      }
    }

    const rawUpdatedMember = await prisma.member.update({
      where: { id },
      data: {
        ...(role !== undefined && { role }),
        ...(payGradeId !== undefined && { payGradeId }),
        ...(rank !== undefined && { rank: encrypt(rank) }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        payGrade: true,
      },
    });

    const updatedMember = decryptMember(rawUpdatedMember);

    const previousState = {
      role: existingMember.role,
      payGradeId: existingMember.payGradeId,
      rank: existingMember.rank,
      isActive: existingMember.isActive,
    };

    const newState = {
      role: updatedMember.role,
      payGradeId: updatedMember.payGradeId,
      rank: updatedMember.rank,
      isActive: updatedMember.isActive,
    };

    const auditAction = isActive === false ? 'MEMBER_DEACTIVATE' : 'SETTINGS_CHANGE';
    await logAudit({
      orgId,
      actorId,
      action: auditAction,
      entityType: 'Member',
      entityId: id,
      previousState,
      newState,
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...safeMember } = updatedMember;
    return NextResponse.json(safeMember);
  } catch (error) {
    console.error('Update member error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
