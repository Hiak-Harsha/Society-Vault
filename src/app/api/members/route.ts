import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { addMemberSchema } from '@/lib/validators';
import { logAudit } from '@/lib/audit';

import { encrypt, encryptDeterministic, decryptMember } from '@/lib/security';

export async function GET(request: Request) {
  try {
    const orgId = request.headers.get('x-user-org-id');

    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    // Fetch all members in organization
    const rawMembers = await prisma.member.findMany({
      where: { orgId },
      include: {
        payGrade: true,
      },
    });

    // Decrypt in memory
    const decryptedMembers = rawMembers.map(m => decryptMember(m));

    // Sort by decrypted name
    decryptedMembers.sort((a, b) => a.name.localeCompare(b.name));

    // Filter in memory to support searching on encrypted columns
    const filteredMembers = search
      ? decryptedMembers.filter(m =>
          m.name.toLowerCase().includes(search.toLowerCase()) ||
          m.email.toLowerCase().includes(search.toLowerCase()) ||
          m.employeeId.toLowerCase().includes(search.toLowerCase())
        )
      : decryptedMembers;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const safeMembers = filteredMembers.map(({ passwordHash, ...m }) => m);
    return NextResponse.json(safeMembers);
  } catch (error) {
    console.error('List members error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const orgId = request.headers.get('x-user-org-id');
    const actorId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');

    if (!orgId || !actorId || !['ADMIN', 'TREASURER'].includes(userRole || '')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const result = addMemberSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid inputs', details: result.error.format() }, { status: 400 });
    }

    const { name, email, employeeId, role, payGradeId, rank } = result.data;

    // Check email unique
    const encryptedEmail = encryptDeterministic(email);
    const emailExists = await prisma.member.findUnique({ where: { email: encryptedEmail } });
    if (emailExists) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    // Check employeeId unique in this org
    const empIdExists = await prisma.member.findUnique({
      where: {
        orgId_employeeId: { orgId, employeeId },
      },
    });
    if (empIdExists) {
      return NextResponse.json({ error: 'Employee ID already exists in this organization' }, { status: 409 });
    }

    // Check pay grade exists in this org
    if (payGradeId) {
      const payGrade = await prisma.payGradeTier.findFirst({
        where: { id: payGradeId, orgId },
      });
      if (!payGrade) {
        return NextResponse.json({ error: 'Invalid Pay Grade selected' }, { status: 400 });
      }
    }

    // Default password is Welcome@123
    const defaultPasswordHash = await hashPassword('Welcome@123');

    const rawMember = await prisma.member.create({
      data: {
        orgId,
        employeeId,
        name: encrypt(name),
        email: encryptedEmail,
        passwordHash: defaultPasswordHash,
        role,
        payGradeId,
        rank: rank ? encrypt(rank) : null,
      },
      include: {
        payGrade: true,
      },
    });

    const member = decryptMember(rawMember);

    await logAudit({
      orgId,
      actorId,
      action: 'MEMBER_ADD',
      entityType: 'Member',
      entityId: member.id,
      newState: { name: member.name, email: member.email, role: member.role, rank: member.rank, employeeId: member.employeeId },
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...safeMember } = member;
    return NextResponse.json(safeMember, { status: 201 });
  } catch (error) {
    console.error('Create member error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
