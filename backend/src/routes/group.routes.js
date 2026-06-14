const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const auth = require('../middleware/auth');
const {
  createGroup, getGroups, getGroup, updateGroup,
  addMember, updateMember, getAllUsers,
} = require('../controllers/group.controller');
const {
  getGroupBalances, getSimplifiedDebts, getBalanceBreakdown,
} = require('../controllers/dashboard.controller');

// All group routes require authentication
router.use(auth);

// GET /api/groups/users/all — list all users (for member selection)
router.get('/users/all', getAllUsers);

// POST /api/groups
router.post(
  '/',
  [body('name').trim().notEmpty().withMessage('Group name is required.')],
  validate,
  createGroup
);

// GET /api/groups
router.get('/', getGroups);

// GET /api/groups/:id
router.get('/:id', getGroup);

// PUT /api/groups/:id
router.put('/:id', updateGroup);

// POST /api/groups/:id/members
router.post(
  '/:id/members',
  [body('userId').isInt().withMessage('Valid user ID is required.')],
  validate,
  addMember
);

// PUT /api/groups/:id/members/:userId
router.put('/:id/members/:userId', updateMember);

// Balance routes
router.get('/:id/balances', getGroupBalances);
router.get('/:id/balances/simplified', getSimplifiedDebts);
router.get('/:id/balances/:userId/breakdown', getBalanceBreakdown);

module.exports = router;
