const router = require('express').Router();
const auth = require('../middleware/auth');
const {
  createSettlement, getSettlements, deleteSettlement,
} = require('../controllers/settlement.controller');

router.use(auth);

// DELETE /api/settlements/:id
router.delete('/:id', deleteSettlement);

module.exports = router;

// Export group-scoped handlers
module.exports.groupScoped = { createSettlement, getSettlements };
