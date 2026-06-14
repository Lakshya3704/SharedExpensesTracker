const { PrismaClient } = require('@prisma/client');
const { convertToINR } = require('../services/currency.service');

const prisma = new PrismaClient();

/**
 * Record a settlement (debt payment).
 * POST /api/groups/:groupId/settlements
 */
exports.createSettlement = async (req, res, next) => {
  try {
    const groupId = parseInt(req.params.groupId);
    const { fromUserId, toUserId, amount, currency = 'INR', settledAt, notes } = req.body;

    const settlement = await prisma.settlement.create({
      data: {
        groupId,
        fromUserId,
        toUserId,
        amount: parseFloat(amount),
        currency: currency.toUpperCase(),
        settledAt: settledAt ? new Date(settledAt) : new Date(),
        notes,
      },
      include: {
        fromUser: { select: { id: true, name: true } },
        toUser: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({ settlement });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all settlements for a group.
 * GET /api/groups/:groupId/settlements
 */
exports.getSettlements = async (req, res, next) => {
  try {
    const groupId = parseInt(req.params.groupId);

    const settlements = await prisma.settlement.findMany({
      where: { groupId },
      include: {
        fromUser: { select: { id: true, name: true } },
        toUser: { select: { id: true, name: true } },
      },
      orderBy: { settledAt: 'desc' },
    });

    res.json({ settlements });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a settlement.
 * DELETE /api/settlements/:id
 */
exports.deleteSettlement = async (req, res, next) => {
  try {
    await prisma.settlement.delete({
      where: { id: parseInt(req.params.id) },
    });
    res.json({ message: 'Settlement deleted.' });
  } catch (error) {
    next(error);
  }
};
