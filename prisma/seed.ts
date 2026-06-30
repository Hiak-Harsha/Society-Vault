import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { encrypt, encryptDeterministic, calculateTransactionHash } from '../src/lib/security';

const prisma = new PrismaClient();

interface SeedTransaction {
  id: string;
  orgId: string;
  memberId: string;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'REPAYMENT';
  amount: number;
  paymentMethod: string;
  referenceNumber: string;
  description: string;
  timestamp: Date;
}

async function main() {
  console.log('🌱 Seeding SocietyVault database with Cryptographic Security...');

  // Reset database before seeding (for cleanliness)
  await prisma.transaction.deleteMany({});
  await prisma.repayment.deleteMany({});
  await prisma.loanWitness.deleteMany({});
  await prisma.loanApplication.deleteMany({});
  await prisma.contribution.deleteMany({});
  await prisma.member.deleteMany({});
  await prisma.payGradeTier.deleteMany({});
  await prisma.orgPolicy.deleteMany({});
  await prisma.fundSummary.deleteMany({});
  await prisma.organization.deleteMany({});

  // Create a demo organization
  const org = await prisma.organization.create({
    data: {
      id: uuidv4(),
      name: 'National Bank of India - Employee Cooperative',
      code: 'NBI-COOP',
      adminEmail: 'admin@nbi.com',
      isActive: true,
    },
  });

  console.log(`✅ Organization created: ${org.name}`);

  // Create org policy
  await prisma.orgPolicy.create({
    data: {
      id: uuidv4(),
      orgId: org.id,
      interestModel: 'FLAT',
      interestRate: 5,
      maxLoanAmount: 500000,
      loanMultiplierCap: 3,
      maxTenureMonths: 24,
      minWitnesses: 3,
      minWitnessApprovals: 2,
      approvalMode: 'ADMIN_AND_WITNESSES',
      repaymentMode: 'MANUAL',
      coolingPeriodDays: 30,
      maxConcurrentLoans: 1,
      ipWhitelist: '127.0.0.1,192.168.1.0/24',
      directoryType: 'NONE',
    },
  });

  console.log('✅ Organization policy configured with IP Whitelisting');

  // Create pay grade tiers
  const tiers = [
    { gradeName: 'Junior Associate', level: 1, monthlyContribution: 500, description: 'Entry level employees' },
    { gradeName: 'Associate', level: 2, monthlyContribution: 1000, description: 'Mid-level employees' },
    { gradeName: 'Senior Associate', level: 3, monthlyContribution: 2000, description: 'Senior employees' },
    { gradeName: 'Manager', level: 4, monthlyContribution: 3500, description: 'Managerial staff' },
    { gradeName: 'Director', level: 5, monthlyContribution: 5000, description: 'Director level and above' },
  ];

  const createdTiers: Record<number, string> = {};
  for (const tier of tiers) {
    const t = await prisma.payGradeTier.create({
      data: {
        id: uuidv4(),
        orgId: org.id,
        ...tier,
      },
    });
    createdTiers[tier.level] = t.id;
  }

  console.log('✅ Pay grade tiers created');

  // Create members with encrypted PII
  const passwordHash = await bcrypt.hash('Admin@123', 12);
  const memberPasswordHash = await bcrypt.hash('Member@123', 12);

  const adminMember = await prisma.member.create({
    data: {
      id: uuidv4(),
      orgId: org.id,
      employeeId: 'EMP001',
      name: encrypt('Rajesh Kumar'),
      email: encryptDeterministic('admin@nbi.com'),
      passwordHash: passwordHash,
      role: 'ADMIN',
      payGradeId: createdTiers[5],
      rank: encrypt('Chief Manager'),
      totalContributed: 60000,
      isActive: true,
    },
  });

  const treasurer = await prisma.member.create({
    data: {
      id: uuidv4(),
      orgId: org.id,
      employeeId: 'EMP002',
      name: encrypt('Priya Sharma'),
      email: encryptDeterministic('treasurer@nbi.com'),
      passwordHash: passwordHash,
      role: 'TREASURER',
      payGradeId: createdTiers[4],
      rank: encrypt('Senior Manager'),
      totalContributed: 42000,
      isActive: true,
    },
  });

  const members = [
    { employeeId: 'EMP003', name: 'Amit Patel', email: 'amit@nbi.com', payGradeLevel: 3, rank: 'Team Lead', totalContributed: 24000 },
    { employeeId: 'EMP004', name: 'Sneha Gupta', email: 'sneha@nbi.com', payGradeLevel: 2, rank: 'Senior Clerk', totalContributed: 12000 },
    { employeeId: 'EMP005', name: 'Vikram Singh', email: 'vikram@nbi.com', payGradeLevel: 3, rank: 'Assistant Manager', totalContributed: 24000 },
    { employeeId: 'EMP006', name: 'Anita Desai', email: 'anita@nbi.com', payGradeLevel: 1, rank: 'Junior Clerk', totalContributed: 6000 },
    { employeeId: 'EMP007', name: 'Rohit Verma', email: 'rohit@nbi.com', payGradeLevel: 2, rank: 'Clerk', totalContributed: 12000 },
    { employeeId: 'EMP008', name: 'Deepa Nair', email: 'deepa@nbi.com', payGradeLevel: 4, rank: 'Branch Manager', totalContributed: 42000 },
    { employeeId: 'EMP009', name: 'Suresh Iyer', email: 'suresh@nbi.com', payGradeLevel: 1, rank: 'Probationary Officer', totalContributed: 6000 },
    { employeeId: 'EMP010', name: 'Kavita Reddy', email: 'kavita@nbi.com', payGradeLevel: 3, rank: 'Senior Officer', totalContributed: 24000 },
  ];

  const createdMembers = [
    { id: adminMember.id, name: 'Rajesh Kumar', employeeId: 'EMP001' },
    { id: treasurer.id, name: 'Priya Sharma', employeeId: 'EMP002' },
  ];

  for (const m of members) {
    const member = await prisma.member.create({
      data: {
        id: uuidv4(),
        orgId: org.id,
        employeeId: m.employeeId,
        name: encrypt(m.name),
        email: encryptDeterministic(m.email),
        passwordHash: memberPasswordHash,
        role: 'MEMBER',
        payGradeId: createdTiers[m.payGradeLevel],
        rank: encrypt(m.rank),
        totalContributed: m.totalContributed,
        isActive: true,
      },
    });
    createdMembers.push({ id: member.id, name: m.name, employeeId: m.employeeId });
  }

  console.log(`✅ ${createdMembers.length} members created with encrypted details`);

  // Contribution history
  const months = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06'];
  const allMembers = await prisma.member.findMany({
    where: { orgId: org.id },
    include: { payGrade: true },
  });

  const paymentMethods = ['UPI', 'BANK_TRANSFER', 'NET_BANKING', 'CARDS'];
  const seedTransactions: SeedTransaction[] = [];

  for (const member of allMembers) {
    for (const month of months) {
      const amount = member.payGrade?.monthlyContribution || 500;
      const refNum = `TXN${Math.floor(1000000000 + Math.random() * 9000000000)}`;
      const pMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];

      await prisma.contribution.create({
        data: {
          id: uuidv4(),
          memberId: member.id,
          orgId: org.id,
          amount,
          month,
          status: 'CONFIRMED',
          confirmedBy: adminMember.id,
          paidAt: new Date(`${month}-15`),
          confirmedAt: new Date(`${month}-16`),
          paymentMethod: encrypt(pMethod),
          referenceNumber: encryptDeterministic(refNum),
        },
      });

      // Buffer transaction input for sequence chaining
      seedTransactions.push({
        id: uuidv4(),
        orgId: org.id,
        memberId: member.id,
        type: 'DEPOSIT',
        amount,
        paymentMethod: pMethod,
        referenceNumber: refNum,
        description: `Contribution for month ${month}`,
        timestamp: new Date(`${month}-15`),
      });
    }
  }

  console.log('✅ Contribution records created');

  // Create a sample loan application
  const loanApplicant = createdMembers.find(m => m.employeeId === 'EMP003');
  if (loanApplicant) {
    const loanAmount = 50000;
    const loan = await prisma.loanApplication.create({
      data: {
        id: uuidv4(),
        applicantId: loanApplicant.id,
        orgId: org.id,
        amount: loanAmount,
        purpose: 'Medical emergency - spouse surgery required at Apollo Hospital. Need immediate funds for hospital deposit and surgery charges.',
        category: 'MEDICAL',
        tenureMonths: 12,
        interestRate: 5,
        status: 'REPAYING',
        approvedBy: adminMember.id,
        appliedAt: new Date('2026-03-01'),
        approvedAt: new Date('2026-03-05'),
        disbursedAt: new Date('2026-03-06'),
      },
    });

    // Buffer loan withdrawal transaction
    const disburseRef = `TXN${Math.floor(1000000000 + Math.random() * 9000000000)}`;
    seedTransactions.push({
      id: uuidv4(),
      orgId: org.id,
      memberId: loanApplicant.id,
      type: 'WITHDRAWAL',
      amount: loanAmount,
      paymentMethod: 'BANK_TRANSFER',
      referenceNumber: disburseRef,
      description: `Loan disbursement for application ID ${loan.id.substring(0, 8)}`,
      timestamp: new Date('2026-03-06'),
    });

    // Add witnesses
    const witnessMembers = createdMembers.filter(m =>
      ['EMP004', 'EMP005', 'EMP007'].includes(m.employeeId)
    );
    for (const w of witnessMembers) {
      await prisma.loanWitness.create({
        data: {
          id: uuidv4(),
          loanId: loan.id,
          witnessId: w.id,
          status: 'ACCEPTED',
          remarks: 'I vouch for this loan. Genuine medical need.',
          respondedAt: new Date('2026-03-03'),
        },
      });
    }

    // Add repayments
    const repaymentMonths = ['2026-04', '2026-05', '2026-06'];
    for (const month of repaymentMonths) {
      const repayAmount = 4375;
      const principalPortion = 4167;
      const interestPortion = 208;
      const repayRef = `TXN${Math.floor(1000000000 + Math.random() * 9000000000)}`;
      const pMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];

      await prisma.repayment.create({
        data: {
          id: uuidv4(),
          loanId: loan.id,
          amount: repayAmount,
          principalPortion,
          interestPortion,
          month,
          status: 'CONFIRMED',
          confirmedBy: treasurer.id,
          paidAt: new Date(`${month}-25`),
          confirmedAt: new Date(`${month}-26`),
          paymentMethod: encrypt(pMethod),
          referenceNumber: encryptDeterministic(repayRef),
        },
      });

      // Buffer repayment transaction
      seedTransactions.push({
        id: uuidv4(),
        orgId: org.id,
        memberId: loanApplicant.id,
        type: 'REPAYMENT',
        amount: repayAmount,
        paymentMethod: pMethod,
        referenceNumber: repayRef,
        description: `Loan repayment for month ${month}`,
        timestamp: new Date(`${month}-25`),
      });
    }

    console.log('✅ Sample loan with repayments configured');
  }

  // Chain and persist all transactions
  console.log(`🔗 Chaining and persisting ${seedTransactions.length} transactions...`);
  seedTransactions.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  let lastHash = '';
  for (const st of seedTransactions) {
    const hashVal = calculateTransactionHash({
      id: st.id,
      orgId: st.orgId,
      type: st.type,
      amount: st.amount,
      paymentMethod: st.paymentMethod,
      referenceNumber: st.referenceNumber,
      timestamp: st.timestamp,
      previousHash: lastHash,
    });

    await prisma.transaction.create({
      data: {
        id: st.id,
        orgId: st.orgId,
        memberId: st.memberId,
        type: st.type,
        amount: st.amount,
        paymentMethod: encrypt(st.paymentMethod),
        referenceNumber: encryptDeterministic(st.referenceNumber),
        description: encrypt(st.description),
        timestamp: st.timestamp,
        previousHash: lastHash,
        hash: hashVal,
        status: 'COMPLETED',
      },
    });

    lastHash = hashVal;
  }

  // Create fund summary
  const totalContributions = 60000 + 42000 + (24000 * 3) + (12000 * 2) + (6000 * 2) + 42000; // Total members contributions
  const totalRepaidAmount = 3 * 4375;
  await prisma.fundSummary.create({
    data: {
      id: uuidv4(),
      orgId: org.id,
      totalPool: totalContributions,
      totalDisbursed: 50000,
      totalRepaid: totalRepaidAmount,
      availableBalance: totalContributions - 50000 + totalRepaidAmount,
      activeLoans: 1,
    },
  });

  console.log('✅ Fund summary initialized');
  console.log('\n🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
