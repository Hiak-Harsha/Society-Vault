import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyPassword, createToken, setSessionCookie } from '@/lib/auth';
import { loginSchema } from '@/lib/validators';
import { logAudit } from '@/lib/audit';

import { encryptDeterministic, decryptMember } from '@/lib/security';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = loginSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid inputs', details: result.error.format() }, { status: 400 });
    }

    const { email, password } = result.data;
    const encryptedEmail = encryptDeterministic(email);

    const rawMember = await prisma.member.findUnique({
      where: { email: encryptedEmail },
      include: { organization: true },
    });

    if (!rawMember || !rawMember.isActive) {
      return NextResponse.json({ error: 'Invalid credentials or inactive account' }, { status: 401 });
    }

    const member = decryptMember(rawMember);

    // Fetch org policy for IP whitelisting
    const policy = await prisma.orgPolicy.findUnique({
      where: { orgId: member.orgId },
    });
    const ipWhitelist = policy?.ipWhitelist || '';
    const clientIp = request.headers.get('x-forwarded-for') || '127.0.0.1';

    const { isIpWhitelisted } = await import('@/lib/security');
    if (!isIpWhitelisted(clientIp, ipWhitelist)) {
      return NextResponse.json({ error: 'Access denied: Client IP is not whitelisted by the organization.' }, { status: 403 });
    }

    const isPasswordValid = await verifyPassword(password, member.passwordHash);

    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = await createToken({
      userId: member.id,
      email: member.email,
      role: member.role,
      orgId: member.orgId,
      name: member.name,
      ipWhitelist,
    });

    // Log login audit
    await logAudit({
      orgId: member.orgId,
      actorId: member.id,
      action: 'LOGIN',
      entityType: 'Member',
      entityId: member.id,
      newState: { name: member.name, email: member.email, role: member.role },
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: member.id,
        name: member.name,
        email: member.email,
        role: member.role,
        orgId: member.orgId,
        orgName: member.organization.name,
      },
    });

    const cookieString = setSessionCookie(token);
    response.headers.set('Set-Cookie', cookieString);

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
