const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Create a new group.
 * POST /api/groups
 */
exports.createGroup = async (req, res, next) => {
  try {
    const { name, description } = req.body;

    const group = await prisma.group.create({
      data: {
        name,
        description,
        createdBy: req.user.id,
        members: {
          create: {
            userId: req.user.id,
            role: 'ADMIN',
            joinedAt: new Date(),
          },
        },
      },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
        creator: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({ group });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all groups for the current user.
 * GET /api/groups
 */
exports.getGroups = async (req, res, next) => {
  try {
    const groups = await prisma.group.findMany({
      where: {
        members: { some: { userId: req.user.id } },
      },
      include: {
        members: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { joinedAt: 'asc' },
        },
        creator: { select: { id: true, name: true } },
        _count: { select: { expenses: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ groups });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single group by ID.
 * GET /api/groups/:id
 */
exports.getGroup = async (req, res, next) => {
  try {
    const group = await prisma.group.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { joinedAt: 'asc' },
        },
        creator: { select: { id: true, name: true } },
        _count: { select: { expenses: true, settlements: true } },
      },
    });

    if (!group) {
      return res.status(404).json({ error: 'Group not found.' });
    }

    // Check if user is a member
    const isMember = group.members.some(m => m.userId === req.user.id);
    if (!isMember) {
      return res.status(403).json({ error: 'You are not a member of this group.' });
    }

    res.json({ group });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a group.
 * PUT /api/groups/:id
 */
exports.updateGroup = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const groupId = parseInt(req.params.id);

    const group = await prisma.group.update({
      where: { id: groupId },
      data: { name, description },
      include: {
        members: { include: { user: { select: { id: true, name: true } } } },
      },
    });

    res.json({ group });
  } catch (error) {
    next(error);
  }
};

/**
 * Add a member to a group.
 * POST /api/groups/:id/members
 */
exports.addMember = async (req, res, next) => {
  try {
    const groupId = parseInt(req.params.id);
    const { userId, joinedAt } = req.body;

    // Check if already an active member
    const existingMember = await prisma.groupMember.findFirst({
      where: { groupId, userId, leftAt: null },
    });
    if (existingMember) {
      return res.status(409).json({ error: 'User is already an active member of this group.' });
    }

    const member = await prisma.groupMember.create({
      data: {
        groupId,
        userId,
        joinedAt: joinedAt ? new Date(joinedAt) : new Date(),
        role: 'MEMBER',
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    res.status(201).json({ member });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a member (e.g., set left_at to mark as departed).
 * PUT /api/groups/:id/members/:userId
 */
exports.updateMember = async (req, res, next) => {
  try {
    const groupId = parseInt(req.params.id);
    const userId = parseInt(req.params.userId);
    const { leftAt } = req.body;

    const member = await prisma.groupMember.findFirst({
      where: { groupId, userId, leftAt: null },
    });

    if (!member) {
      return res.status(404).json({ error: 'Active member not found.' });
    }

    const updated = await prisma.groupMember.update({
      where: { id: member.id },
      data: { leftAt: leftAt ? new Date(leftAt) : new Date() },
      include: { user: { select: { id: true, name: true } } },
    });

    res.json({ member: updated });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all users (for adding members to groups).
 * GET /api/groups/users/all
 */
exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    });
    res.json({ users });
  } catch (error) {
    next(error);
  }
};
