const express = require('express');
const router = express.Router();
const categoriesController = require('../controllers/categories.controller');
const authMiddleware = require('../../../middlewares/auth.middleware');
const adminMiddleware = require('../../../middlewares/admin.middleware');

// Public routes
// GET /api/v1/categories
router.get('/', categoriesController.getAll);

// GET /api/v1/categories/:id
router.get('/:id', categoriesController.getById);

// Admin routes
// POST /api/v1/admin/categories
router.post('/',
  authMiddleware, adminMiddleware,
  categoriesController.create
);

// PUT /api/v1/admin/categories/:id
router.put('/:id',
  authMiddleware, adminMiddleware,
  categoriesController.update
);

// DELETE /api/v1/admin/categories/:id
router.delete('/:id',
  authMiddleware, adminMiddleware,
  categoriesController.delete
);

module.exports = router;