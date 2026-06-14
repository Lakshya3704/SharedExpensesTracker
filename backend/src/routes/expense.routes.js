const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const auth = require('../middleware/auth');
const {
  createExpense, getExpenses, getExpense, updateExpense, deleteExpense,
} = require('../controllers/expense.controller');

router.use(auth);

// POST /api/groups/:groupId/expenses — mounted via app
// We re-export these to be mounted on the group router too
// But for standalone /api/expenses/:id access:

// GET /api/expenses/:id
router.get('/:id', getExpense);

// PUT /api/expenses/:id
router.put('/:id', updateExpense);

// DELETE /api/expenses/:id
router.delete('/:id', deleteExpense);

module.exports = router;

// Export handlers for group-scoped routes
module.exports.groupScoped = { createExpense, getExpenses };
