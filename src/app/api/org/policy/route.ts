import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { orgPolicySchema } from '@/lib/validators';
import { logAudit } from '@/lib/audit';

export async function GET(request: Request) {
  try {
    const orgId = request.headers.get('x-user-org-id');

    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const policy = await prisma.orgPolicy.findUnique({
      where: { orgId },
    });

    if (!policy) {
      return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
    }

    return NextResponse.json(policy);
  } catch (error) {
    console.error('Get policy error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const orgId = request.headers.get('x-user-org-id');
    const actorId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');

    if (!orgId || !actorId || userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const body = await request.json();
    const result = orgPolicySchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid inputs', details: result.error.format() }, { status: 400 });
    }

    const existing = await prisma.orgPolicy.findUnique({
      where: { orgId },
    });

    const updated = await prisma.orgPolicy.update({
      where: { orgId },
      data: result.data,
    });

    await logAudit({
      orgId,
      actorId,
      action: 'SETTINGS_CHANGE',
      entityType: 'OrgPolicy',
      entityId: updated.id,
      previousState: existing,
      newState: updated,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update policy error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
