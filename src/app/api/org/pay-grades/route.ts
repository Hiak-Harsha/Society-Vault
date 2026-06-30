import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { payGradeTierSchema } from '@/lib/validators';
import { logAudit } from '@/lib/audit';

export async function GET(request: Request) {
  try {
    const orgId = request.headers.get('x-user-org-id');

    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tiers = await prisma.payGradeTier.findMany({
      where: { orgId },
      orderBy: { level: 'asc' },
    });

    return NextResponse.json(tiers);
  } catch (error) {
    console.error('List pay grades error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const orgId = request.headers.get('x-user-org-id');
    const actorId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');

    if (!orgId || !actorId || userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const body = await request.json();
    const result = payGradeTierSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid inputs', details: result.error.format() }, { status: 400 });
    }

    const { gradeName, level, monthlyContribution, description } = result.data;

    // Check if level already exists in this org
    const existingLevel = await prisma.payGradeTier.findUnique({
      where: {
        orgId_level: { orgId, level },
      },
    });

    if (existingLevel) {
      return NextResponse.json({ error: `Pay grade level ${level} already exists in this organization` }, { status: 409 });
    }

    const tier = await prisma.payGradeTier.create({
      data: {
        orgId,
        gradeName,
        level,
        monthlyContribution,
        description,
      },
    });

    await logAudit({
      orgId,
      actorId,
      action: 'SETTINGS_CHANGE',
      entityType: 'PayGradeTier',
      entityId: tier.id,
      newState: tier,
    });

    return NextResponse.json(tier, { status: 201 });
  } catch (error) {
    console.error('Create pay grade error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
