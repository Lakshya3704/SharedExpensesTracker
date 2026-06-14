const { PrismaClient } = require('@prisma/client');
const { convertToINR, roundToTwo } = require('../services/currency.service');
const { parseSplitDetails } = require('../services/import.service');

const prisma = new PrismaClient();

/**
 * Create an expense with splits.
 * POST /api/groups/:groupId/expenses
 */
exports.createExpense = async (req, res, next) => {
  try {
    const groupId = parseInt(req.params.groupId);
    const {
      description, amount, currency = 'INR', splitType,
      paidById, expenseDate, notes, participants,
    } = req.body;

    // Calculate splits based on split type
    const splits = calculateSplits(
      splitType, parseFloat(amount), currency, participants
    );

    const expense = await prisma.expense.create({
      data: {
        groupId,
        description,
        amount: parseFloat(amount),
        currency: currency.toUpperCase(),
        splitType: splitType.toUpperCase(),
        paidById,
        expenseDate: new Date(expenseDate),
        notes,
        splits: {
          create: splits.map(s => ({
            userId: s.userId,
            shareValue: s.shareValue,
            owedAmount: s.owedAmount,
            owedAmountInr: s.owedAmountInr,
          })),
        },
      },
      include: {
        splits: { include: { user: { select: { id: true, name: true } } } },
        paidBy: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({ expense });
  } catch (error) {
    next(error);
  }
};

/**
 * Get expenses for a group (paginated).
 * GET /api/groups/:groupId/expenses
 */
exports.getExpenses = async (req, res, next) => {
  try {
    const groupId = parseInt(req.params.groupId);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where: { groupId, isSettlement: false },
        include: {
          splits: { include: { user: { select: { id: true, name: true } } } },
          paidBy: { select: { id: true, name: true } },
        },
        orderBy: { expenseDate: 'desc' },
        skip,
        take: limit,
      }),
      prisma.expense.count({ where: { groupId, isSettlement: false } }),
    ]);

    res.json({
      expenses,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single expense by ID.
 * GET /api/expenses/:id
 */
exports.getExpense = async (req, res, next) => {
  try {
    const expense = await prisma.expense.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        splits: { include: { user: { select: { id: true, name: true } } } },
        paidBy: { select: { id: true, name: true } },
        group: { select: { id: true, name: true } },
      },
    });

    if (!expense) {
      return res.status(404).json({ error: 'Expense not found.' });
    }

    res.json({ expense });
  } catch (error) {
    next(error);
  }
};

/**
 * Update an expense.
 * PUT /api/expenses/:id
 */
exports.updateExpense = async (req, res, next) => {
  try {
    const expenseId = parseInt(req.params.id);
    const {
      description, amount, currency, splitType,
      paidById, expenseDate, notes, participants, status,
    } = req.body;

    // If participants/split changed, recalculate splits
    if (participants && splitType && amount) {
      const splits = calculateSplits(
        splitType, parseFloat(amount), currency || 'INR', participants
      );

      // Delete old splits and create new ones
      await prisma.expenseSplit.deleteMany({ where: { expenseId } });

      await prisma.expense.update({
        where: { id: expenseId },
        data: {
          description,
          amount: parseFloat(amount),
          currency: (currency || 'INR').toUpperCase(),
          splitType: splitType.toUpperCase(),
          paidById,
          expenseDate: expenseDate ? new Date(expenseDate) : undefined,
          notes,
          status,
          splits: {
            create: splits.map(s => ({
              userId: s.userId,
              shareValue: s.shareValue,
              owedAmount: s.owedAmount,
              owedAmountInr: s.owedAmountInr,
            })),
          },
        },
      });
    } else {
      await prisma.expense.update({
        where: { id: expenseId },
        data: {
          description,
          notes,
          status,
        },
      });
    }

    const updated = await prisma.expense.findUnique({
      where: { id: expenseId },
      include: {
        splits: { include: { user: { select: { id: true, name: true } } } },
        paidBy: { select: { id: true, name: true } },
      },
    });

    res.json({ expense: updated });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete an expense.
 * DELETE /api/expenses/:id
 */
exports.deleteExpense = async (req, res, next) => {
  try {
    await prisma.expense.delete({
      where: { id: parseInt(req.params.id) },
    });
    res.json({ message: 'Expense deleted.' });
  } catch (error) {
    next(error);
  }
};

/**
 * Calculate splits based on split type.
 * 
 * Split types supported:
 * - EQUAL: amount / number of participants
 * - UNEQUAL: specific amounts per person
 * - PERCENTAGE: percentage of total per person
 * - SHARE: proportional shares (e.g., 1:2:1:2)
 * 
 * @param {string} splitType - EQUAL, UNEQUAL, PERCENTAGE, SHARE
 * @param {number} totalAmount - Total expense amount
 * @param {string} currency - Currency code
 * @param {Array} participants - Array of { userId, value? }
 *   value is the share/percentage/amount depending on splitType
 * @returns {Array} Array of { userId, shareValue, owedAmount, owedAmountInr }
 */
function calculateSplits(splitType, totalAmount, currency, participants) {
  const type = splitType.toUpperCase();
  const splits = [];

  switch (type) {
    case 'EQUAL': {
      const perPerson = roundToTwo(totalAmount / participants.length);
      // Handle rounding remainder: give the difference to the first person
      const remainder = roundToTwo(totalAmount - perPerson * participants.length);

      participants.forEach((p, i) => {
        const owedAmount = i === 0 ? roundToTwo(perPerson + remainder) : perPerson;
        splits.push({
          userId: p.userId,
          shareValue: 1, // equal share = 1 each
          owedAmount,
          owedAmountInr: convertToINR(owedAmount, currency),
        });
      });
      break;
    }

    case 'UNEQUAL': {
      for (const p of participants) {
        const owedAmount = roundToTwo(p.value || 0);
        splits.push({
          userId: p.userId,
          shareValue: owedAmount,
          owedAmount,
          owedAmountInr: convertToINR(owedAmount, currency),
        });
      }
      break;
    }

    case 'PERCENTAGE': {
      for (const p of participants) {
        const percentage = p.value || 0;
        const owedAmount = roundToTwo(totalAmount * percentage / 100);
        splits.push({
          userId: p.userId,
          shareValue: percentage,
          owedAmount,
          owedAmountInr: convertToINR(owedAmount, currency),
        });
      }
      break;
    }

    case 'SHARE': {
      const totalShares = participants.reduce((sum, p) => sum + (p.value || 1), 0);
      for (const p of participants) {
        const shares = p.value || 1;
        const owedAmount = roundToTwo(totalAmount * shares / totalShares);
        splits.push({
          userId: p.userId,
          shareValue: shares,
          owedAmount,
          owedAmountInr: convertToINR(owedAmount, currency),
        });
      }
      break;
    }

    default:
      throw new Error(`Unknown split type: ${splitType}`);
  }

  return splits;
}

module.exports = { ...exports, calculateSplits };
