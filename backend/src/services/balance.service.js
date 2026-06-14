/**
 * Balance calculation service.
 * 
 * Algorithm:
 * For each active expense in a group:
 *   1. Look up who paid and how much (in INR)
 *   2. Look up each participant's owed share (in INR)
 *   3. For the payer: they are owed (total - their share) by others
 *   4. For each non-payer participant: they owe their share to the payer
 * 
 * Then subtract settlements to get net balances.
 * 
 * This gives us a pairwise debt map: { "A→B": amount A owes B }
 * From that we compute per-user net balance and optionally simplify debts.
 */
const { PrismaClient } = require('@prisma/client');
const { convertToINR, roundToTwo } = require('./currency.service');

const prisma = new PrismaClient();

/**
 * Calculate detailed balances for a group.
 * Returns pairwise debts and per-user summaries.
 */
async function calculateGroupBalances(groupId) {
  // Get all active expenses with their splits
  const expenses = await prisma.expense.findMany({
    where: {
      groupId,
      status: 'ACTIVE',
      isSettlement: false,
    },
    include: {
      splits: { include: { user: { select: { id: true, name: true } } } },
      paidBy: { select: { id: true, name: true } },
    },
    orderBy: { expenseDate: 'asc' },
  });

  // Get all settlements
  const settlements = await prisma.settlement.findMany({
    where: { groupId },
    include: {
      fromUser: { select: { id: true, name: true } },
      toUser: { select: { id: true, name: true } },
    },
  });

  // Build pairwise debt map
  // Key: "debtorId:creditorId", Value: amount debtor owes creditor (in INR)
  const debts = {};

  // Process expenses
  for (const expense of expenses) {
    const payerId = expense.paidById;
    const totalInr = convertToINR(parseFloat(expense.amount), expense.currency);

    for (const split of expense.splits) {
      const participantId = split.userId;
      if (participantId === payerId) continue; // payer doesn't owe themselves

      const owedInr = parseFloat(split.owedAmountInr);
      const key = `${participantId}:${payerId}`;
      debts[key] = (debts[key] || 0) + owedInr;
    }
  }

  // Process settlements (reduce debts)
  for (const settlement of settlements) {
    const amountInr = convertToINR(parseFloat(settlement.amount), settlement.currency);
    const key = `${settlement.fromUserId}:${settlement.toUserId}`;
    const reverseKey = `${settlement.toUserId}:${settlement.fromUserId}`;

    if (debts[key]) {
      debts[key] -= amountInr;
    } else {
      // Settlement in reverse direction means the other person now owes more
      debts[reverseKey] = (debts[reverseKey] || 0) - amountInr;
    }
  }

  // Net out bidirectional debts (if A owes B $50 and B owes A $30, then A owes B $20)
  const netDebts = {};
  const processedPairs = new Set();

  for (const key of Object.keys(debts)) {
    const [debtorId, creditorId] = key.split(':').map(Number);
    const pairKey = [Math.min(debtorId, creditorId), Math.max(debtorId, creditorId)].join(':');

    if (processedPairs.has(pairKey)) continue;
    processedPairs.add(pairKey);

    const forwardKey = `${debtorId}:${creditorId}`;
    const reverseKey = `${creditorId}:${debtorId}`;
    const forward = debts[forwardKey] || 0;
    const reverse = debts[reverseKey] || 0;
    const net = roundToTwo(forward - reverse);

    if (Math.abs(net) > 0.01) {
      if (net > 0) {
        netDebts[forwardKey] = net;
      } else {
        netDebts[reverseKey] = Math.abs(net);
      }
    }
  }

  // Build per-user summary
  const userBalances = {};

  // Get all group members
  const members = await prisma.groupMember.findMany({
    where: { groupId },
    include: { user: { select: { id: true, name: true } } },
  });

  for (const member of members) {
    userBalances[member.userId] = {
      userId: member.userId,
      name: member.user.name,
      totalPaid: 0,
      totalOwed: 0,
      netBalance: 0, // positive = others owe you, negative = you owe others
      isActive: !member.leftAt,
    };
  }

  // Calculate totals from expenses
  for (const expense of expenses) {
    const payerId = expense.paidById;
    const totalInr = convertToINR(parseFloat(expense.amount), expense.currency);

    if (userBalances[payerId]) {
      userBalances[payerId].totalPaid += totalInr;
    }

    for (const split of expense.splits) {
      if (userBalances[split.userId]) {
        userBalances[split.userId].totalOwed += parseFloat(split.owedAmountInr);
      }
    }
  }

  // Calculate net balances
  for (const userId of Object.keys(userBalances)) {
    const bal = userBalances[userId];
    bal.totalPaid = roundToTwo(bal.totalPaid);
    bal.totalOwed = roundToTwo(bal.totalOwed);
    bal.netBalance = roundToTwo(bal.totalPaid - bal.totalOwed);
  }

  return {
    debts: netDebts,
    userBalances: Object.values(userBalances),
    expenses: expenses.length,
    settlements: settlements.length,
  };
}

/**
 * Get expense-level breakdown for a specific user in a group.
 * This is Rohan's request: "see exactly which expenses make up the balance"
 */
async function getUserBalanceBreakdown(groupId, userId) {
  const expenses = await prisma.expense.findMany({
    where: {
      groupId,
      status: 'ACTIVE',
      isSettlement: false,
      splits: { some: { userId } },
    },
    include: {
      splits: {
        where: { userId },
        select: { owedAmount: true, owedAmountInr: true, shareValue: true },
      },
      paidBy: { select: { id: true, name: true } },
    },
    orderBy: { expenseDate: 'asc' },
  });

  const breakdown = expenses.map(exp => {
    const split = exp.splits[0];
    const isPayer = exp.paidById === userId;
    const totalInr = convertToINR(parseFloat(exp.amount), exp.currency);
    const owedInr = parseFloat(split.owedAmountInr);

    return {
      id: exp.id,
      date: exp.expenseDate,
      description: exp.description,
      totalAmount: parseFloat(exp.amount),
      currency: exp.currency,
      paidBy: exp.paidBy.name,
      isPayer,
      yourShare: owedInr,
      // If you paid, others owe you (total - your share)
      // If you didn't pay, you owe the payer your share
      impact: isPayer ? roundToTwo(totalInr - owedInr) : roundToTwo(-owedInr),
    };
  });

  const settlements = await prisma.settlement.findMany({
    where: {
      groupId,
      OR: [{ fromUserId: userId }, { toUserId: userId }],
    },
    include: {
      fromUser: { select: { name: true } },
      toUser: { select: { name: true } },
    },
    orderBy: { settledAt: 'asc' },
  });

  const settlementBreakdown = settlements.map(s => ({
    id: s.id,
    date: s.settledAt,
    description: `Settlement: ${s.fromUser.name} → ${s.toUser.name}`,
    amount: parseFloat(s.amount),
    currency: s.currency,
    impact: s.fromUserId === userId
      ? roundToTwo(-convertToINR(parseFloat(s.amount), s.currency))
      : roundToTwo(convertToINR(parseFloat(s.amount), s.currency)),
  }));

  return { expenses: breakdown, settlements: settlementBreakdown };
}

module.exports = { calculateGroupBalances, getUserBalanceBreakdown };
