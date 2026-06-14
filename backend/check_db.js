const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const expenses = await prisma.expense.findMany({
    where: { groupId: 1 },
    orderBy: { id: 'asc' }
  });
  
  console.log(`--- Group 1 Expenses (${expenses.length}) ---`);
  expenses.forEach(e => {
    console.log(`[${e.id}] Row ${e.importRow}: ${e.description} - Paid by ${e.paidById}: ${e.amount} ${e.currency} (status: ${e.status})`);
  });

  const settlements = await prisma.settlement.findMany({
    where: { groupId: 1 },
    orderBy: { id: 'asc' }
  });

  console.log(`\n--- Group 1 Settlements (${settlements.length}) ---`);
  settlements.forEach(s => {
    console.log(`[${s.id}]: From ${s.fromUserId} to ${s.toUserId}: ${s.amount} ${s.currency}`);
  });
}

main().finally(() => prisma.$disconnect());
