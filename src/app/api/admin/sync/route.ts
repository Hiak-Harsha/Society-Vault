import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { encrypt, encryptDeterministic, decryptOrgPolicy } from '@/lib/security';
import { hashPassword } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const orgId = request.headers.get('x-user-org-id');
    const actorId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');

    if (!orgId || !actorId || !['ADMIN', 'SUPER_ADMIN'].includes(userRole || '')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch policy
    const policy = await prisma.orgPolicy.findUnique({
      where: { orgId },
    });

    if (!policy || policy.directoryType === 'NONE') {
      return NextResponse.json({ error: 'Directory sync is not configured' }, { status: 400 });
    }

    const decryptedPolicy = decryptOrgPolicy(policy);
    const { directoryType, directoryEndpoint } = decryptedPolicy;

    // High fidelity corporate employee mocks for simulation
    const mockLDAPEmployees = [
      { employeeId: 'EMP101', name: 'Nikhil Sen', email: 'nikhil@nbi.com', rank: 'Assistant Manager', gradeLevel: 3 },
      { employeeId: 'EMP102', name: 'Riya Sen', email: 'riya@nbi.com', rank: 'Junior Associate', gradeLevel: 1 },
      { employeeId: 'EMP103', name: 'Devendra Chawla', email: 'devendra@nbi.com', rank: 'Branch Director', gradeLevel: 5 },
      { employeeId: 'EMP104', name: 'Karan Johar', email: 'karan@nbi.com', rank: 'Operations Manager', gradeLevel: 4 },
      { employeeId: 'EMP105', name: 'Janhvi Kapoor', email: 'janhvi@nbi.com', rank: 'Senior Clerk', gradeLevel: 2 },
    ];

    const mockRESTEmployees = [
      { employeeId: 'EMP201', name: 'Vikramaditya Rao', email: 'vikram.rao@nbi.com', rank: 'Regional Director', gradeLevel: 5 },
      { employeeId: 'EMP202', name: 'Ananya Pandey', email: 'ananya@nbi.com', rank: 'Associate Clerk', gradeLevel: 1 },
      { employeeId: 'EMP203', name: 'Siddharth Malhotra', email: 'siddharth@nbi.com', rank: 'Operations Lead', gradeLevel: 3 },
    ];

    const mockSQLEmployees = [
      { employeeId: 'EMP301', name: 'Alia Bhatt', email: 'alia@nbi.com', rank: 'Branch Manager', gradeLevel: 4 },
      { employeeId: 'EMP302', name: 'Varun Dhawan', email: 'varun@nbi.com', rank: 'Senior Associate', gradeLevel: 3 },
    ];

    let employeesToSync: typeof mockLDAPEmployees = [];

    if (directoryType === 'LDAP') {
      employeesToSync = mockLDAPEmployees;
    } else if (directoryType === 'REST_API') {
      employeesToSync = mockRESTEmployees;
    } else if (directoryType === 'SQL_DB') {
      employeesToSync = mockSQLEmployees;
    }

    // Fetch pay grades for resolving payGradeId based on gradeLevel
    // Fetch all existing members of this organization once to optimize lookup latency
    const existingMembers = await prisma.member.findMany({
      where: { orgId }
    });

    const payGrades = await prisma.payGradeTier.findMany({
      where: { orgId },
    });

    const defaultPasswordHash = await hashPassword('Welcome@123');

    let createdCount = 0;
    let updatedCount = 0;
    const syncedRecords: { employeeId: string; name: string; action: 'CREATED' | 'UPDATED' }[] = [];

    let deactivatedCount = 0;

    // Wrap the entire write loop in a single atomic database transaction to prevent partial state corruption
    await prisma.$transaction(async (tx) => {
      for (const emp of employeesToSync) {
        // Find matching payGradeId
        const matchedGrade = payGrades.find(pg => pg.level === emp.gradeLevel) || payGrades[0];
        
        const encryptedEmail = encryptDeterministic(emp.email);

        // Perform in-memory lookup instead of querying database on each iteration
        const existing = existingMembers.find(
          m => m.employeeId === emp.employeeId || m.email === encryptedEmail
        );

        if (existing) {
          // Update existing member (keep password and role, update name, rank, payGrade)
          await tx.member.update({
            where: { id: existing.id },
            data: {
              name: encrypt(emp.name),
              email: encryptedEmail,
              rank: encrypt(emp.rank),
              payGradeId: matchedGrade ? matchedGrade.id : existing.payGradeId,
              isActive: true,
            }
          });
          updatedCount++;
          syncedRecords.push({ employeeId: emp.employeeId, name: emp.name, action: 'UPDATED' });
        } else {
          // Create new member
          await tx.member.create({
            data: {
              orgId,
              employeeId: emp.employeeId,
              name: encrypt(emp.name),
              email: encryptedEmail,
              passwordHash: defaultPasswordHash,
              role: 'MEMBER',
              payGradeId: matchedGrade ? matchedGrade.id : null,
              rank: encrypt(emp.rank),
            }
          });
          createdCount++;
          syncedRecords.push({ employeeId: emp.employeeId, name: emp.name, action: 'CREATED' });
        }
      }

      // Deactivate members not in the directory (consistency enforcement)
      const directoryEmployeeIds = new Set(employeesToSync.map(e => e.employeeId));
      const membersToDeactivate = existingMembers.filter(
        m => !directoryEmployeeIds.has(m.employeeId) && m.role === 'MEMBER' && m.isActive !== false
      );
      for (const member of membersToDeactivate) {
        await tx.member.update({
          where: { id: member.id },
          data: { isActive: false }
        });
        deactivatedCount++;
      }

      await tx.orgPolicy.update({
        where: { orgId },
        data: {
          ledgerVerifiedAt: new Date()
        }
      });
    });

    await logAudit({
      orgId,
      actorId,
      action: 'SETTINGS_CHANGE',
      entityType: 'OrgPolicy',
      entityId: policy.id,
      newState: {
        action: 'DIRECTORY_SYNC',
        type: directoryType,
        endpoint: directoryEndpoint,
        created: createdCount,
        updated: updatedCount,
        deactivated: deactivatedCount,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Sync completed. Created: ${createdCount}, Updated: ${updatedCount}, Deactivated: ${deactivatedCount} employees.`,
      records: syncedRecords,
    });
  } catch (error) {
    const err = error as Error;
    console.error('Directory sync error:', err);
    return NextResponse.json({ error: `Sync failed: ${err.message}` }, { status: 500 });
  }
}
