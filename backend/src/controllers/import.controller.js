const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const { analyzeCSV, finalizeImport } = require('../services/import.service');

const prisma = new PrismaClient();

// Configure multer for CSV upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed.'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

/**
 * Upload and analyze a CSV file.
 * POST /api/groups/:groupId/import
 */
exports.uploadCSV = [
  upload.single('file'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No CSV file uploaded.' });
      }

      const groupId = parseInt(req.params.groupId);
      const result = await analyzeCSV(req.file.path, groupId, req.user.id);

      res.status(200).json({
        message: 'CSV analyzed. Review anomalies before finalizing.',
        ...result,
      });
    } catch (error) {
      next(error);
    }
  },
];

/**
 * Get import details and anomalies.
 * GET /api/imports/:id
 */
exports.getImport = async (req, res, next) => {
  try {
    const importRecord = await prisma.import.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        anomalies: { orderBy: { rowNumber: 'asc' } },
        importer: { select: { id: true, name: true } },
        group: { select: { id: true, name: true } },
      },
    });

    if (!importRecord) {
      return res.status(404).json({ error: 'Import not found.' });
    }

    res.json({ import: importRecord });
  } catch (error) {
    next(error);
  }
};

/**
 * Resolve a specific anomaly.
 * PUT /api/imports/:importId/anomalies/:anomalyId
 */
exports.resolveAnomaly = async (req, res, next) => {
  try {
    const { action, value } = req.body;

    const anomaly = await prisma.importAnomaly.update({
      where: { id: parseInt(req.params.anomalyId) },
      data: {
        actionTaken: action,
        resolvedValue: value || null,
        approvedById: req.user.id,
        approvedAt: new Date(),
      },
    });

    res.json({ anomaly });
  } catch (error) {
    next(error);
  }
};

/**
 * Finalize an import after anomaly review.
 * POST /api/imports/:id/finalize
 */
exports.finalizeImportHandler = async (req, res, next) => {
  try {
    const importId = parseInt(req.params.id);
    const { resolutions = {} } = req.body;

    const result = await finalizeImport(importId, req.user.id, resolutions);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Get import report (for display/download).
 * GET /api/imports/:id/report
 */
exports.getImportReport = async (req, res, next) => {
  try {
    const importRecord = await prisma.import.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        anomalies: { orderBy: { rowNumber: 'asc' } },
        importer: { select: { name: true } },
        group: { select: { name: true } },
      },
    });

    if (!importRecord) {
      return res.status(404).json({ error: 'Import not found.' });
    }

    const report = {
      title: `Import Report: ${importRecord.filename}`,
      group: importRecord.group.name,
      importedBy: importRecord.importer.name,
      importedAt: importRecord.createdAt,
      status: importRecord.status,
      summary: {
        totalRows: importRecord.totalRows,
        importedRows: importRecord.importedRows,
        skippedRows: importRecord.skippedRows,
        totalAnomalies: importRecord.anomalies.length,
        autoFixed: importRecord.anomalies.filter(a => a.severity === 'AUTO_FIXED').length,
        warnings: importRecord.anomalies.filter(a => a.severity === 'WARNING').length,
        requiresAction: importRecord.anomalies.filter(a => a.severity === 'REQUIRES_ACTION').length,
      },
      anomalies: importRecord.anomalies.map(a => ({
        row: a.rowNumber,
        type: a.anomalyType,
        severity: a.severity,
        description: a.description,
        original: a.originalValue,
        resolved: a.resolvedValue,
        action: a.actionTaken,
      })),
    };

    res.json({ report });
  } catch (error) {
    next(error);
  }
};
