const express = require('express');
const router = express.Router();
const inspectionController = require('../controllers/inspection.controller');
const authMiddleware = require('../../../middlewares/auth.middleware');
const { uploadInspection } = require('../../../middlewares/upload.middleware');

// POST /api/v1/inspect
router.post('/',
  authMiddleware,
  uploadInspection.single('image'),
  inspectionController.inspect
);

// GET /api/v1/inspect/history
router.get('/history', authMiddleware, inspectionController.getHistory);

module.exports = router;
