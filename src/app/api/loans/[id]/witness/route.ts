import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { loanWitnessResponseSchema } from '@/lib/validators';
import { logAudit } from '@/lib/audit';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const orgId = request.headers.get('x-user-org-id');
    const witnessId = request.headers.get('x-user-id');
    const { id: loanId } = await params;

    if (!orgId || !witnessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const result = loanWitnessResponseSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid inputs', details: result.error.format() }, { status: 400 });
    }

    const { status, remarks } = result.data; // ACCEPTED or DECLINED

    // Verify witness request exists
    const witnessRequest = await prisma.loanWitness.findUnique({
      where: {
        loanId_witnessId: { loanId, witnessId },
      },
      include: {
        loan: {
          include: {
            organization: {
              include: { policy: true },
            },
          },
        },
      },
    });

    if (!witnessRequest) {
      return NextResponse.json({ error: 'Witness request not found for this loan' }, { status: 404 });
    }

    if (witnessRequest.status !== 'REQUESTED') {
      return NextResponse.json({ error: 'You have already responded to this request' }, { status: 400 });
    }

    if (witnessRequest.loan.status !== 'PENDING_WITNESSES') {
      return NextResponse.json({ error: 'Loan application is no longer in pending witness stage' }, { status: 400 });
    }

    // Process witness response
    const updatedWitness = await prisma.$transaction(async (tx) => {
      // 1. Update witness response
      const updated = await tx.loanWitness.update({
        where: {
          loanId_witnessId: { loanId, witnessId },
        },
        data: {
          status,
          remarks,
          respondedAt: new Date(),
        },
      });

      // 2. Fetch all witness statuses for this loan
      const allWitnesses = await tx.loanWitness.findMany({
        where: { loanId },
      });

      const acceptedCount = allWitnesses.filter((w) => w.status === 'ACCEPTED').length;
      const policy = witnessRequest.loan.organization.policy;

      if (policy) {
        // If we reach the required number of approvals, auto-transition to PENDING_APPROVAL
        if (acceptedCount >= policy.minWitnessApprovals) {
          await tx.loanApplication.update({
            where: { id: loanId },
            data: {
              status: 'PENDING_APPROVAL',
            },
          });
        }
        
        // If too many decline so we can't possibly meet policy, we could auto-reject, but let's keep it simple.
        // If any witness declines, the admin can still review it or decline.
      }

      return updated;
    });

    await logAudit({
      orgId,
      actorId: witnessId,
      action: 'LOAN_WITNESS',
      entityType: 'LoanWitness',
      entityId: updatedWitness.id,
      newState: { status, remarks, loanId },
    });

    return NextResponse.json({ success: true, witness: updatedWitness });
  } catch (error) {
    console.error('Witness response error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
