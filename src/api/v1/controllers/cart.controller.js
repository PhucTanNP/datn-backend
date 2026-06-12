const cartService = require('../../../services/cart.service');
const supabase = require('../../../config/database');
const ApiResponse = require('../../../utils/response');
const logger = require('../../../utils/logger');

exports.getCart = async (req, res, next) => {
  try {
    const cart = await cartService.getCart(req.user.id);
    return ApiResponse.success(res, cart);
  } catch (error) {
    logger.error('Get cart failed', error, { userId: req.user.id });
    next(error);
  }
};

exports.syncCart = async (req, res, next) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items)) {
      return ApiResponse.error(res, 'Items must be an array', 400);
    }

    const cart = await cartService.syncCart(req.user.id, items);
    return ApiResponse.success(res, cart, 'Cart synced');
  } catch (error) {
    logger.error('Sync cart failed', error, { userId: req.user.id });
    next(error);
  }
};

exports.addItem = async (req, res, next) => {
  try {
    const { productId, quantity = 1 } = req.body;

    if (!productId) {
      return ApiResponse.error(res, 'Product ID is required', 400);
    }

    // Fetch product details for price snapshot
    const { data: product } = await supabase
      .from('products')
      .select('id, name, sku, slug, price, sale_price, images:product_images(url)')
      .eq('id', productId)
      .eq('is_active', true)
      .single();

    if (!product) {
      return ApiResponse.error(res, 'Product not found', 404);
    }

    const unitPrice = product.sale_price || product.price;
    const productData = {
      id: product.id,
      name: product.name,
      sku: product.sku,
      slug: product.slug,
      price: unitPrice,
      images: product.images?.[0] || null,
    };

    const cart = await cartService.addItem(req.user.id, productId, quantity, productData);
    return ApiResponse.success(res, cart, 'Item added to cart');
  } catch (error) {
    logger.error('Add to cart failed', error, { userId: req.user.id, productId: req.body.productId });
    next(error);
  }
};

exports.updateItemQuantity = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;

    if (quantity === undefined || quantity < 0) {
      return ApiResponse.error(res, 'Valid quantity is required', 400);
    }

    const cart = await cartService.updateItemQuantity(req.user.id, productId, quantity);
    return ApiResponse.success(res, cart, 'Cart updated');
  } catch (error) {
    logger.error('Update cart item failed', error, { userId: req.user.id, productId: req.params.productId });
    next(error);
  }
};

exports.removeItem = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const cart = await cartService.removeItem(req.user.id, productId);
    return ApiResponse.success(res, cart, 'Item removed');
  } catch (error) {
    logger.error('Remove from cart failed', error, { userId: req.user.id, productId: req.params.productId });
    next(error);
  }
};

exports.clearCart = async (req, res, next) => {
  try {
    await cartService.clearCart(req.user.id);
    return ApiResponse.success(res, null, 'Cart cleared');
  } catch (error) {
    logger.error('Clear cart failed', error, { userId: req.user.id });
    next(error);
  }
};
