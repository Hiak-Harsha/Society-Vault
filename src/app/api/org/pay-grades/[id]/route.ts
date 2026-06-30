import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const orgId = request.headers.get('x-user-org-id');
    const actorId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');
    const { id } = await params;

    if (!orgId || !actorId || userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { gradeName, monthlyContribution, description } = body;

    const existing = await prisma.payGradeTier.findFirst({
      where: { id, orgId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Pay grade tier not found' }, { status: 404 });
    }

    const updated = await prisma.payGradeTier.update({
      where: { id },
      data: {
        ...(gradeName !== undefined && { gradeName }),
        ...(monthlyContribution !== undefined && { monthlyContribution }),
        ...(description !== undefined && { description }),
      },
    });

    await logAudit({
      orgId,
      actorId,
      action: 'SETTINGS_CHANGE',
      entityType: 'PayGradeTier',
      entityId: id,
      previousState: existing,
      newState: updated,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update pay grade error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const orgId = request.headers.get('x-user-org-id');
    const actorId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');
    const { id } = await params;

    if (!orgId || !actorId || userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tier = await prisma.payGradeTier.findFirst({
      where: { id, orgId },
    });

    if (!tier) {
      return NextResponse.json({ error: 'Pay grade tier not found' }, { status: 404 });
    }

    // Verify if any active member is assigned to this tier
    const memberCount = await prisma.member.count({
      where: { payGradeId: id, orgId },
    });

    if (memberCount > 0) {
      return NextResponse.json({ error: `Cannot delete pay grade tier. There are ${memberCount} members assigned to this tier.` }, { status: 409 });
    }

    await prisma.payGradeTier.delete({
      where: { id },
    });

    await logAudit({
      orgId,
      actorId,
      action: 'SETTINGS_CHANGE',
      entityType: 'PayGradeTier',
      entityId: id,
      previousState: tier,
      newState: null,
    });

    return NextResponse.json({ success: true, message: 'Pay grade tier deleted successfully' });
  } catch (error) {
    console.error('Delete pay grade error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
