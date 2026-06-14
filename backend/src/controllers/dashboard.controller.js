const { PrismaClient } = require('@prisma/client');
const { calculateGroupBalances, getUserBalanceBreakdown } = require('../services/balance.service');
const { simplifyDebts } = require('../services/simplifyDebts.service');

const prisma = new PrismaClient();

/**
 * Get overall dashboard for the current user.
 * GET /api/dashboard
 */
exports.getDashboard = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get all groups the user belongs to
    const memberships = await prisma.groupMember.findMany({
      where: { userId },
      include: {
        group: {
          include: {
            _count: { select: { expenses: true, settlements: true, members: true } },
          },
        },
      },
    });

    // Get recent expenses across all groups
    const recentExpenses = await prisma.expense.findMany({
      where: {
        group: { members: { some: { userId } } },
        isSettlement: false,
        status: 'ACTIVE',
      },
      include: {
        paidBy: { select: { id: true, name: true } },
        group: { select: { id: true, name: true } },
      },
      orderBy: { expenseDate: 'desc' },
      take: 10,
    });

    // Calculate total owed/owing across all groups
    let totalOwed = 0;  // others owe you
    let totalOwing = 0; // you owe others

    for (const m of memberships) {
      try {
        const balances = await calculateGroupBalances(m.groupId);
        const userBal = balances.userBalances.find(b => b.userId === userId);
        if (userBal) {
          if (userBal.netBalance > 0) totalOwed += userBal.netBalance;
          else totalOwing += Math.abs(userBal.netBalance);
        }
      } catch (e) {
        // Skip groups with calculation errors
      }
    }

    res.json({
      groups: memberships.map(m => ({
        id: m.group.id,
        name: m.group.name,
        memberCount: m.group._count.members,
        expenseCount: m.group._count.expenses,
        isActive: !m.leftAt,
        joinedAt: m.joinedAt,
        leftAt: m.leftAt,
      })),
      recentExpenses: recentExpenses.map(e => ({
        id: e.id,
        description: e.description,
        amount: parseFloat(e.amount),
        currency: e.currency,
        date: e.expenseDate,
        paidBy: e.paidBy.name,
        group: e.group.name,
        groupId: e.group.id,
      })),
      summary: {
        totalGroups: memberships.length,
        totalOwed: Math.round(totalOwed * 100) / 100,
        totalOwing: Math.round(totalOwing * 100) / 100,
        netBalance: Math.round((totalOwed - totalOwing) * 100) / 100,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get group balances.
 * GET /api/groups/:id/balances
 */
exports.getGroupBalances = async (req, res, next) => {
  try {
    const groupId = parseInt(req.params.id);
    const balances = await calculateGroupBalances(groupId);

    // Build user name map for debt formatting
    const members = await prisma.groupMember.findMany({
      where: { groupId },
      include: { user: { select: { id: true, name: true } } },
    });
    const userNames = {};
    members.forEach(m => { userNames[m.userId] = m.user.name; });

    // Format debts as readable transactions
    const debtList = Object.entries(balances.debts).map(([key, amount]) => {
      const [debtorId, creditorId] = key.split(':').map(Number);
      return {
        from: { id: debtorId, name: userNames[debtorId] },
        to: { id: creditorId, name: userNames[creditorId] },
        amount: Math.round(amount * 100) / 100,
      };
    });

    res.json({
      balances: balances.userBalances,
      debts: debtList,
      stats: { expenses: balances.expenses, settlements: balances.settlements },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get simplified debts (minimum transactions).
 * GET /api/groups/:id/balances/simplified
 */
exports.getSimplifiedDebts = async (req, res, next) => {
  try {
    const groupId = parseInt(req.params.id);
    const balances = await calculateGroupBalances(groupId);

    const members = await prisma.groupMember.findMany({
      where: { groupId },
      include: { user: { select: { id: true, name: true } } },
    });
    const userNames = {};
    members.forEach(m => { userNames[m.userId] = m.user.name; });

    const simplified = simplifyDebts(balances.debts, userNames);

    res.json({
      transactions: simplified,
      message: `${simplified.length} transaction(s) needed to settle all debts.`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get expense-level balance breakdown for a user.
 * GET /api/groups/:id/balances/:userId/breakdown
 */
exports.getBalanceBreakdown = async (req, res, next) => {
  try {
    const groupId = parseInt(req.params.id);
    const userId = parseInt(req.params.userId);

    const breakdown = await getUserBalanceBreakdown(groupId, userId);

    res.json({ breakdown });
  } catch (error) {
    next(error);
  }
};
