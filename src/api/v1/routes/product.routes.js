const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const authMiddleware = require('../../../middlewares/auth.middleware');
const adminMiddleware = require('../../../middlewares/admin.middleware');
const { uploadProduct } = require('../../../middlewares/upload.middleware');

// Public routes
// GET /api/v1/products
router.get('/', productController.getAll);

// GET /api/v1/products/:slug
router.get('/:slug', productController.getBySlug);

// Admin routes
// POST /api/v1/admin/products
router.post('/',
  authMiddleware, adminMiddleware,
  productController.create
);

// PUT /api/v1/admin/products/:id
router.put('/:id',
  authMiddleware, adminMiddleware,
  productController.update
);

// DELETE /api/v1/admin/products/:id
router.delete('/:id',
  authMiddleware, adminMiddleware,
  productController.delete
);

// POST /api/v1/admin/products/:id/images
router.post('/:id/images',
  authMiddleware, adminMiddleware,
  uploadProduct.array('images', 5),
  productController.uploadImages
);

// DELETE /api/v1/admin/products/:id/images/:imageId
router.delete('/:id/images/:imageId',
  authMiddleware, adminMiddleware,
  productController.deleteImage
);

module.exports = router;
