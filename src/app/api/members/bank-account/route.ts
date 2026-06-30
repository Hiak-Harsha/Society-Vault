import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { encrypt, decrypt } from '@/lib/security';

/**
 * GET /api/members/bank-account
 * Returns the current member's bank account number (decrypted last 4 digits) and auto-deduct status.
 */
export async function GET(request: Request) {
  try {
    const userId = request.headers.get('x-user-id');
    const orgId  = request.headers.get('x-user-org-id');

    if (!userId || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const member = await prisma.member.findFirst({
      where: { id: userId, orgId },
      select: { bankAccountNumber: true, autoDeductEnabled: true },
    });

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Only reveal masked last-4 digits
    let maskedAccount: string | null = null;
    if (member.bankAccountNumber) {
      try {
        const decrypted = decrypt(member.bankAccountNumber);
        maskedAccount = `****${decrypted.slice(-4)}`;
      } catch {
        maskedAccount = '****';
      }
    }

    return NextResponse.json({
      hasBankAccount: !!member.bankAccountNumber,
      maskedAccount,
      autoDeductEnabled: member.autoDeductEnabled,
    });
  } catch (error) {
    console.error('GET bank-account error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/members/bank-account
 * Save or update the member's bank account number and auto-deduct preference.
 */
export async function PUT(request: Request) {
  try {
    const userId = request.headers.get('x-user-id');
    const orgId  = request.headers.get('x-user-org-id');

    if (!userId || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { bankAccountNumber, autoDeductEnabled } = body;

    if (typeof autoDeductEnabled !== 'boolean') {
      return NextResponse.json({ error: 'autoDeductEnabled must be a boolean' }, { status: 400 });
    }

    // Validate account number if provided
    if (bankAccountNumber !== undefined && bankAccountNumber !== null && bankAccountNumber !== '') {
      if (typeof bankAccountNumber !== 'string' || bankAccountNumber.length < 8 || bankAccountNumber.length > 20) {
        return NextResponse.json(
          { error: 'Bank account number must be between 8 and 20 digits' },
          { status: 400 },
        );
      }
      if (!/^\d+$/.test(bankAccountNumber)) {
        return NextResponse.json({ error: 'Bank account number must contain only digits' }, { status: 400 });
      }
    }

    // Build update payload
    const updateData: Record<string, unknown> = { autoDeductEnabled };
    if (bankAccountNumber) {
      updateData.bankAccountNumber = encrypt(bankAccountNumber);
    } else if (bankAccountNumber === '' || bankAccountNumber === null) {
      // Clearing the account
      updateData.bankAccountNumber = null;
      updateData.autoDeductEnabled = false;
    }

    await prisma.member.update({
      where: { id: userId },
      data: updateData,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PUT bank-account error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/members/bank-account/deduct
 * Simulate initiating an auto-deduction from the member's saved bank account.
 * In production this would trigger a bank API/NACH mandate call.
 */
export async function POST(request: Request) {
  try {
    const userId = request.headers.get('x-user-id');
    const orgId  = request.headers.get('x-user-org-id');
    const userRole = request.headers.get('x-user-role');

    if (!userId || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { amount, memberId } = body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    let targetMemberId = userId;
    if (memberId && ['ADMIN', 'TREASURER'].includes(userRole || '')) {
      targetMemberId = memberId;
    }

    const member = await prisma.member.findFirst({
      where: { id: targetMemberId, orgId },
      select: { bankAccountNumber: true, autoDeductEnabled: true, name: true },
    });

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    if (!member.bankAccountNumber || !member.autoDeductEnabled) {
      return NextResponse.json(
        { error: 'Auto-deduction is not enabled or no bank account saved' },
        { status: 400 },
      );
    }

    // Decrypt to validate, then mask for response
    let maskedAccount = '****';
    try {
      const decrypted = decrypt(member.bankAccountNumber);
      maskedAccount = `****${decrypted.slice(-4)}`;
    } catch {
      return NextResponse.json({ error: 'Failed to process bank account details' }, { status: 500 });
    }

    // Generate a deduction reference number (in production: call NACH/bank API here)
    const refNumber = `AUTODEBIT${Math.floor(1000000000 + Math.random() * 9000000000)}`;

    return NextResponse.json({
      success: true,
      referenceNumber: refNumber,
      paymentMethod: 'BANK_TRANSFER',
      maskedAccount,
      message: `Auto-deduction of ₹${amount.toFixed(2)} initiated from account ${maskedAccount}. Reference: ${refNumber}`,
    });
  } catch (error) {
    console.error('POST bank-account deduct error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
