import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { encrypt, decryptOrgPolicy } from '@/lib/security';

export async function GET(request: Request) {
  try {
    const orgId = request.headers.get('x-user-org-id');
    const userRole = request.headers.get('x-user-role');

    if (!orgId || !['ADMIN', 'SUPER_ADMIN'].includes(userRole || '')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const policy = await prisma.orgPolicy.findUnique({
      where: { orgId },
    });

    if (!policy) {
      return NextResponse.json({ error: 'Policy not configured' }, { status: 404 });
    }

    const decryptedPolicy = decryptOrgPolicy(policy);

    return NextResponse.json({
      directoryType: decryptedPolicy.directoryType,
      directoryEndpoint: decryptedPolicy.directoryEndpoint,
      directoryApiKey: decryptedPolicy.directoryApiKey ? '••••••••' : null,
      directoryMapping: decryptedPolicy.directoryMapping,
      ipWhitelist: decryptedPolicy.ipWhitelist,
    });
  } catch (error) {
    console.error('Get sync config error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const orgId = request.headers.get('x-user-org-id');
    const actorId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');

    if (!orgId || !actorId || !['ADMIN', 'SUPER_ADMIN'].includes(userRole || '')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { directoryType, directoryEndpoint, directoryApiKey, directoryMapping, ipWhitelist } = body;

    if (!['NONE', 'LDAP', 'REST_API', 'SQL_DB'].includes(directoryType)) {
      return NextResponse.json({ error: 'Invalid directory type. Must be NONE, LDAP, REST_API, or SQL_DB' }, { status: 400 });
    }

    const existingPolicy = await prisma.orgPolicy.findUnique({
      where: { orgId },
    });

    if (!existingPolicy) {
      return NextResponse.json({ error: 'Organization policy not found' }, { status: 404 });
    }

    const updated = await prisma.orgPolicy.update({
      where: { orgId },
      data: {
        directoryType,
        directoryEndpoint: directoryEndpoint || null,
        directoryApiKey: directoryApiKey && directoryApiKey !== '••••••••' ? encrypt(directoryApiKey) : (directoryApiKey === '••••••••' ? existingPolicy.directoryApiKey : null),
        directoryMapping: directoryMapping ? JSON.stringify(directoryMapping) : null,
        ipWhitelist: ipWhitelist !== undefined ? ipWhitelist : undefined,
      },
    });

    await logAudit({
      orgId,
      actorId,
      action: 'SETTINGS_CHANGE',
      entityType: 'OrgPolicy',
      entityId: existingPolicy.id,
      previousState: {
        directoryType: existingPolicy.directoryType,
        directoryEndpoint: existingPolicy.directoryEndpoint,
        ipWhitelist: existingPolicy.ipWhitelist,
      },
      newState: {
        directoryType,
        directoryEndpoint,
        ipWhitelist,
      },
    });

    return NextResponse.json({
      success: true,
      policy: {
        directoryType: updated.directoryType,
        directoryEndpoint: updated.directoryEndpoint,
        directoryMapping: updated.directoryMapping,
        ipWhitelist: updated.ipWhitelist,
      },
    });
  } catch (error) {
    console.error('Save sync config error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
