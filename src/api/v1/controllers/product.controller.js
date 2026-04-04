const productService = require('../../../services/product.service');
const cloudinaryService = require('../../../services/cloudinary.service');
const ApiResponse = require('../../../utils/response');
const logger = require('../../../utils/logger');

exports.getAll = async (req, res, next) => {
  try {
    logger.info('Get all products API called', { query: req.query, ip: req.ip });
    const { products, pagination } = await productService.getAll(req.query);
    logger.info('Products retrieved successfully', { count: products.length, pagination });
    return ApiResponse.paginated(res, products, pagination);
  } catch (error) {
    logger.error('Get all products failed', error, { query: req.query });
    next(error);
  }
};

exports.getBySlug = async (req, res, next) => {
  try {
    logger.info('Get product by slug API called', { slug: req.params.slug, ip: req.ip });
    const product = await productService.getBySlug(req.params.slug);
    logger.info('Product retrieved by slug successfully', { productId: product.id, slug: req.params.slug });
    return ApiResponse.success(res, product);
  } catch (error) {
    logger.error('Get product by slug failed', error, { slug: req.params.slug });
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    logger.info('Create product API called', { sku: req.body.sku, name: req.body.name, userId: req.user?.id, ip: req.ip });
    const {
      categoryId, sku, name, slug, description, price, salePrice,
      stockQuantity, size, rimDiameter, loadIndex, speedRating, tireType,
    } = req.body;

    if (!sku || !name || !slug || !price) {
      logger.warn('Create product failed: Missing required fields', { sku, name, slug, price });
      return ApiResponse.error(res, 'SKU, name, slug, and price are required', 400);
    }

    const product = await productService.create({
      categoryId, sku, name, slug, description,
      price: parseFloat(price),
      salePrice: salePrice ? parseFloat(salePrice) : null,
      stockQuantity: parseInt(stockQuantity) || 0,
      size, rimDiameter: rimDiameter ? parseInt(rimDiameter) : null,
      loadIndex, speedRating, tireType,
    });

    logger.info('Product created successfully', { productId: product.id, sku, name });
    return ApiResponse.created(res, product);
  } catch (error) {
    logger.error('Create product failed', error, { sku: req.body.sku, name: req.body.name });
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    logger.info('Update product API called', { productId: req.params.id, userId: req.user?.id, ip: req.ip });
    const product = await productService.update(req.params.id, req.body);
    logger.info('Product updated successfully', { productId: req.params.id });
    return ApiResponse.success(res, product, 'Product updated');
  } catch (error) {
    logger.error('Update product failed', error, { productId: req.params.id });
    next(error);
  }
};

exports.delete = async (req, res, next) => {
  try {
    logger.info('Delete product API called', { productId: req.params.id, userId: req.user?.id, ip: req.ip });
    await productService.delete(req.params.id);
    logger.info('Product deleted successfully', { productId: req.params.id });
    return ApiResponse.success(res, null, 'Product deleted');
  } catch (error) {
    logger.error('Delete product failed', error, { productId: req.params.id });
    next(error);
  }
};

exports.uploadImages = async (req, res, next) => {
  try {
    logger.info('Upload product images API called', { productId: req.params.id, fileCount: req.files?.length, userId: req.user?.id, ip: req.ip });
    if (!req.files || req.files.length === 0) {
      logger.warn('Upload images failed: No images uploaded', { productId: req.params.id });
      return ApiResponse.error(res, 'No images uploaded', 400);
    }

    const images = req.files.map((file, index) => ({
      cloudinaryId: file.filename,
      url: file.path,
      altText: req.body.altText || null,
      isPrimary: index === 0 && req.body.setPrimary === 'true',
      sortOrder: index,
    }));

    await productService.addImages(req.params.id, images);
    logger.info('Product images uploaded successfully', { productId: req.params.id, imageCount: images.length });
    return ApiResponse.success(res, { images }, 'Images uploaded');
  } catch (error) {
    logger.error('Upload product images failed', error, { productId: req.params.id });
    next(error);
  }
};

exports.deleteImage = async (req, res, next) => {
  try {
    logger.info('Delete product image API called', { imageId: req.params.imageId, userId: req.user?.id, ip: req.ip });
    const image = await productService.deleteImage(req.params.imageId);
    if (image && image.cloudinaryId) {
      await cloudinaryService.deleteImage(image.cloudinaryId);
    }
    logger.info('Product image deleted successfully', { imageId: req.params.imageId, cloudinaryId: image?.cloudinaryId });
    return ApiResponse.success(res, null, 'Image deleted');
  } catch (error) {
    logger.error('Delete product image failed', error, { imageId: req.params.imageId });
    next(error);
  }
};
