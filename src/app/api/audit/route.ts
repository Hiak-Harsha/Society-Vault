import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const orgId = request.headers.get('x-user-org-id');
    const userRole = request.headers.get('x-user-role');

    if (!orgId || (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || undefined;
    const actorId = searchParams.get('actorId') || undefined;
    const from = searchParams.get('from') || undefined;
    const to = searchParams.get('to') || undefined;
    
    // Pagination params
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    const whereClause: {
      orgId: string;
      action?: string;
      actorId?: string;
      timestamp?: {
        gte?: Date;
        lte?: Date;
      };
    } = { orgId };

    if (action) {
      whereClause.action = action;
    }
    if (actorId) {
      whereClause.actorId = actorId;
    }

    if (from || to) {
      whereClause.timestamp = {};
      if (from) {
        whereClause.timestamp.gte = new Date(from);
      }
      if (to) {
        // Enforce end of day for the "to" date
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        whereClause.timestamp.lte = toDate;
      }
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: whereClause,
        include: {
          actor: {
            select: {
              name: true,
              employeeId: true,
              email: true,
            },
          },
        },
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('List audit logs error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
