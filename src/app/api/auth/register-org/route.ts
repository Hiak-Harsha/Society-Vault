import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword, createToken, setSessionCookie } from '@/lib/auth';
import { registerOrgSchema } from '@/lib/validators';
import { logAudit } from '@/lib/audit';

import { encrypt, encryptDeterministic, decryptMember } from '@/lib/security';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = registerOrgSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid inputs', details: result.error.format() }, { status: 400 });
    }

    const { orgName, orgCode, adminName, adminEmail, adminPassword, adminEmployeeId } = result.data;

    // Check if code or email exists
    const codeExists = await prisma.organization.findUnique({ where: { code: orgCode.toUpperCase() } });
    if (codeExists) {
      return NextResponse.json({ error: 'Organization code already exists' }, { status: 409 });
    }

    const encryptedEmail = encryptDeterministic(adminEmail);
    const emailExists = await prisma.member.findUnique({ where: { email: encryptedEmail } });
    if (emailExists) {
      return NextResponse.json({ error: 'Admin email already registered' }, { status: 409 });
    }

    const hashedPassword = await hashPassword(adminPassword);

    // Create organization and all defaults in a transaction
    const { org, admin } = await prisma.$transaction(async (tx) => {
      // 1. Create Organization
      const org = await tx.organization.create({
        data: {
          name: orgName,
          code: orgCode.toUpperCase(),
          adminEmail: adminEmail,
        },
      });

      // 2. Create Default Policy
      await tx.orgPolicy.create({
        data: {
          orgId: org.id,
          interestModel: 'FLAT',
          interestRate: 6,
          maxLoanAmount: 200000,
          loanMultiplierCap: 3,
          maxTenureMonths: 24,
          minWitnesses: 3,
          minWitnessApprovals: 2,
          approvalMode: 'ADMIN_AND_WITNESSES',
          repaymentMode: 'MANUAL',
          coolingPeriodDays: 30,
          maxConcurrentLoans: 1,
        },
      });

      // 3. Create Default Pay Grade Tiers (Grade 1 - 5)
      const tiers = [
        { gradeName: 'Junior Staff', level: 1, monthlyContribution: 500, description: 'Grade 1 employees' },
        { gradeName: 'Senior Assistant', level: 2, monthlyContribution: 1000, description: 'Grade 2 employees' },
        { gradeName: 'Officer', level: 3, monthlyContribution: 2000, description: 'Grade 3 employees' },
        { gradeName: 'Manager', level: 4, monthlyContribution: 3500, description: 'Grade 4 employees' },
        { gradeName: 'Director', level: 5, monthlyContribution: 5000, description: 'Grade 5 employees' },
      ];

      const createdTiers = [];
      for (const tier of tiers) {
        const created = await tx.payGradeTier.create({
          data: {
            orgId: org.id,
            ...tier,
          },
        });
        createdTiers.push(created);
      }

      // 4. Create Admin member (using Grade 5 as default)
      const adminGrade = createdTiers.find(t => t.level === 5);
      const admin = await tx.member.create({
        data: {
          orgId: org.id,
          employeeId: adminEmployeeId,
          name: encrypt(adminName),
          email: encryptedEmail,
          passwordHash: hashedPassword,
          role: 'ADMIN',
          payGradeId: adminGrade?.id,
          rank: encrypt('Administrator'),
        },
      });

      // 5. Create empty FundSummary
      await tx.fundSummary.create({
        data: {
          orgId: org.id,
          totalPool: 0,
          totalDisbursed: 0,
          totalRepaid: 0,
          availableBalance: 0,
          activeLoans: 0,
        },
      });

      return { org, admin: decryptMember(admin) };
    });

    // Log registration audit
    await logAudit({
      orgId: org.id,
      actorId: admin.id,
      action: 'MEMBER_ADD',
      entityType: 'Member',
      entityId: admin.id,
      newState: { name: admin.name, email: admin.email, role: admin.role, isOrgAdmin: true },
    });

    const token = await createToken({
      userId: admin.id,
      email: admin.email,
      role: admin.role,
      orgId: admin.orgId,
      name: admin.name,
      ipWhitelist: '',
    });

    const response = NextResponse.json({
      success: true,
      org: { id: org.id, name: org.name, code: org.code },
      user: { id: admin.id, name: admin.name, email: admin.email, role: admin.role },
    });

    const cookieString = setSessionCookie(token);
    response.headers.set('Set-Cookie', cookieString);

    return response;
  } catch (error) {
    console.error('Org registration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
