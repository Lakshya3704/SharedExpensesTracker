const router = require('express').Router();
const auth = require('../middleware/auth');
const { getDashboard } = require('../controllers/dashboard.controller');

router.use(auth);

// GET /api/dashboard
router.get('/', getDashboard);

module.exports = router;
