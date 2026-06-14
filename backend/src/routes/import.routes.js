const router = require('express').Router();
const auth = require('../middleware/auth');
const {
  uploadCSV, getImport, resolveAnomaly, finalizeImportHandler, getImportReport,
} = require('../controllers/import.controller');

router.use(auth);

// GET /api/imports/:id
router.get('/:id', getImport);

// PUT /api/imports/:importId/anomalies/:anomalyId
router.put('/:importId/anomalies/:anomalyId', resolveAnomaly);

// POST /api/imports/:id/finalize
router.post('/:id/finalize', finalizeImportHandler);

// GET /api/imports/:id/report
router.get('/:id/report', getImportReport);

module.exports = router;

// Export upload handler for group-scoped route
module.exports.groupScoped = { uploadCSV };
