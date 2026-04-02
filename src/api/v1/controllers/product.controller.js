const productService = require('../../../services/product.service');
const cloudinaryService = require('../../../services/cloudinary.service');
const ApiResponse = require('../../../utils/response');

exports.getAll = async (req, res, next) => {
  try {
    const { products, pagination } = await productService.getAll(req.query);
    return ApiResponse.paginated(res, products, pagination);
  } catch (error) {
    next(error);
  }
};

exports.getBySlug = async (req, res, next) => {
  try {
    const product = await productService.getBySlug(req.params.slug);
    return ApiResponse.success(res, product);
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const {
      categoryId, sku, name, slug, description, price, salePrice,
      stockQuantity, size, rimDiameter, loadIndex, speedRating, tireType,
    } = req.body;

    if (!sku || !name || !slug || !price) {
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

    return ApiResponse.created(res, product);
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const product = await productService.update(req.params.id, req.body);
    return ApiResponse.success(res, product, 'Product updated');
  } catch (error) {
    next(error);
  }
};

exports.delete = async (req, res, next) => {
  try {
    await productService.delete(req.params.id);
    return ApiResponse.success(res, null, 'Product deleted');
  } catch (error) {
    next(error);
  }
};

exports.uploadImages = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
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
    return ApiResponse.success(res, { images }, 'Images uploaded');
  } catch (error) {
    next(error);
  }
};

exports.deleteImage = async (req, res, next) => {
  try {
    const image = await productService.deleteImage(req.params.imageId);
    if (image && image.cloudinaryId) {
      await cloudinaryService.deleteImage(image.cloudinaryId);
    }
    return ApiResponse.success(res, null, 'Image deleted');
  } catch (error) {
    next(error);
  }
};
