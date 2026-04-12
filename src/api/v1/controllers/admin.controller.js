const supabase = require('../../../config/database');
const ApiResponse = require('../../../utils/response');
const { getPagination, getPaginationMeta } = require('../../../utils/pagination');
const logger = require('../../../utils/logger');

exports.getDashboard = async (req, res, next) => {
  try {
    logger.info('Get admin dashboard API called', { userId: req.user?.id, ip: req.ip });

    // Get stats
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'customer');

    const { count: totalProducts } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    const { count: totalCategories } = await supabase
      .from('categories')
      .select('*', { count: 'exact', head: true });

    const { count: totalOrders } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true });

    const { data: recentOrders } = await supabase
      .from('orders')
      .select(`
        id, order_number, total_amount, status, created_at,
        users!inner(full_name, email)
      `)
      .order('created_at', { ascending: false })
      .limit(5);

    const { data: revenueData } = await supabase
      .from('orders')
      .select('total_amount')
      .in('status', ['confirmed', 'processing', 'shipped', 'delivered']);

    const totalRevenue = revenueData?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;

    logger.info('Admin dashboard data retrieved successfully', {
      totalUsers,
      totalProducts,
      totalCategories,
      totalOrders,
      totalRevenue
    });
    return ApiResponse.success(res, {
      stats: {
        totalUsers,
        totalProducts,
        totalCategories,
        totalOrders,
        totalRevenue,
      },
      recentOrders: recentOrders?.map(order => ({
        id: order.id,
        orderNumber: order.order_number,
        totalAmount: order.total_amount,
        status: order.status,
        createdAt: order.created_at,
        user: {
          fullName: order.users?.full_name,
          email: order.users?.email,
        },
      })) || [],
    });
  } catch (error) {
    logger.error('Get admin dashboard failed', error, { userId: req.user?.id });
    next(error);
  }
};

exports.getUsers = async (req, res, next) => {
  try {
    logger.info('Get users API called', { query: req.query, userId: req.user?.id, ip: req.ip });
    const { page, limit, skip } = getPagination(req.query);

    const { data: users, error: usersError, count } = await supabase
      .from('users')
      .select(`
        id, email, full_name, phone, role, is_active, created_at,
        orders(count)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(skip, skip + limit - 1);

    if (usersError) throw usersError;

    const formattedUsers = users?.map(user => ({
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      phone: user.phone,
      role: user.role,
      isActive: user.is_active,
      createdAt: user.created_at,
      _count: { orders: user.orders?.[0]?.count || 0 },
    })) || [];

    logger.info('Users retrieved successfully', { count: formattedUsers.length, total: count, page, limit });
    return ApiResponse.paginated(res, formattedUsers, getPaginationMeta(count, page, limit));
  } catch (error) {
    logger.error('Get users failed', error, { query: req.query });
    next(error);
  }
};

exports.getOrders = async (req, res, next) => {
  try {
    logger.info('Get orders API called', { query: req.query, userId: req.user?.id, ip: req.ip });
    const { page, limit, skip } = getPagination(req.query);

    const { data: orders, error: ordersError, count } = await supabase
      .from('orders')
      .select(`
        id, order_number, total_amount, status, created_at,
        users!inner(full_name, email)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(skip, skip + limit - 1);

    if (ordersError) throw ordersError;

    const formattedOrders = orders?.map(order => ({
      id: order.id,
      orderNumber: order.order_number,
      totalAmount: order.total_amount,
      status: order.status,
      createdAt: order.created_at,
      user: {
        fullName: order.users?.full_name,
        email: order.users?.email,
      },
    })) || [];

    logger.info('Orders retrieved successfully', { count: formattedOrders.length, total: count, page, limit });
    return ApiResponse.paginated(res, formattedOrders, getPaginationMeta(count, page, limit));
  } catch (error) {
    logger.error('Get orders failed', error, { query: req.query });
    next(error);
  }
};

exports.getProducts = async (req, res, next) => {
  try {
    logger.info('Get products API called', { query: req.query, userId: req.user?.id, ip: req.ip });
    const { page, limit, skip } = getPagination(req.query);

    const { data: products, error: productsError, count } = await supabase
      .from('products')
      .select(`
        id, sku, name, slug, price, sale_price, stock_quantity, is_active, created_at,
        categories(name),
        images:product_images(*)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(skip, skip + limit - 1);

    if (productsError) throw productsError;

    const formattedProducts = products?.map(product => {
      // Sort images by sort_order
      if (product.images) {
        product.images = product.images.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      }

      return {
        id: product.id,
        sku: product.sku,
        name: product.name,
        slug: product.slug,
        price: product.price,
        salePrice: product.sale_price,
        stockQuantity: product.stock_quantity,
        isActive: product.is_active,
        createdAt: product.created_at,
        category: {
          name: product.categories?.name,
        },
        images: product.images || [],
      };
    }) || [];

    logger.info('Products retrieved successfully', { count: formattedProducts.length, total: count, page, limit });
    return ApiResponse.paginated(res, formattedProducts, getPaginationMeta(count, page, limit));
  } catch (error) {
    logger.error('Get products failed', error, { query: req.query });
    next(error);
  }
};

exports.createProduct = async (req, res, next) => {
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

    const parsedPrice = parseFloat(price);
    const parsedSalePrice = salePrice ? parseFloat(salePrice) : null;

    // Validate price range (Decimal(12,2) max is 9999999999.99)
    if (parsedPrice < 0 || parsedPrice >= 10000000000) {
      logger.warn('Create product failed: Invalid price', { price: parsedPrice });
      return ApiResponse.error(res, 'Price must be between 0 and 9,999,999,999.99', 400);
    }

    if (parsedSalePrice !== null && (parsedSalePrice < 0 || parsedSalePrice >= 10000000000)) {
      logger.warn('Create product failed: Invalid sale price', { salePrice: parsedSalePrice });
      return ApiResponse.error(res, 'Sale price must be between 0 and 9,999,999,999.99', 400);
    }

    const { data: product, error } = await supabase
      .from('products')
      .insert({
        category_id: categoryId,
        sku,
        name,
        slug,
        description,
        price: parsedPrice,
        sale_price: parsedSalePrice,
        stock_quantity: parseInt(stockQuantity) || 0,
        size,
        rim_diameter: rimDiameter ? parseInt(rimDiameter) : null,
        load_index: loadIndex,
        speed_rating: speedRating,
        tire_type: tireType,
        is_active: true,
      })
      .select(`
        id, sku, name, slug, description, price, sale_price, stock_quantity,
        size, rim_diameter, load_index, speed_rating, tire_type, is_active, created_at,
        categories(name)
      `)
      .single();

    if (error) throw error;

    // Handle uploaded images
    logger.info('Checking uploaded images', { filesCount: req.files?.length || 0, bodyImage: req.body.image, bodyImages: req.body.images });
    let imageInserts = [];

    if (req.files && req.files.length > 0) {
      // Images uploaded via multipart/form-data
      logger.info('Processing uploaded files', { files: req.files.map(f => ({ filename: f.filename, cloudinaryId: f.cloudinaryId, path: f.path })) });
      imageInserts = req.files.map((file, index) => ({
        product_id: product.id,
        cloudinary_id: file.cloudinaryId,
        url: file.path,
        alt_text: `${product.name} image ${index + 1}`,
        is_primary: index === 0, // First image is primary
        sort_order: index,
      }));
    } else if (req.body.image) {
      // Single image provided in request body
      logger.info('Processing single image from body', { image: req.body.image, cloudinaryId: req.body.cloudinary_id });
      if (typeof req.body.image === 'string') {
        // image is URL string, cloudinary_id from separate field
        imageInserts = [{
          product_id: product.id,
          cloudinary_id: req.body.cloudinary_id || null,
          url: req.body.image,
          alt_text: `${product.name} image`,
          is_primary: true,
          sort_order: 0,
        }];
      } else {
        // image is object with cloudinaryId and url
        imageInserts = [{
          product_id: product.id,
          cloudinary_id: req.body.image.cloudinaryId || req.body.image.public_id,
          url: req.body.image.url || req.body.image.secure_url,
          alt_text: req.body.image.altText || `${product.name} image`,
          is_primary: req.body.image.isPrimary !== false, // default true
          sort_order: req.body.image.sortOrder || 0,
        }];
      }
    } else if (req.body.images && Array.isArray(req.body.images)) {
      // Images provided as URLs in request body
      logger.info('Processing images from body', { images: req.body.images });
      imageInserts = req.body.images.map((img, index) => {
        if (typeof img === 'string') {
          // img is just a URL string
          return {
            product_id: product.id,
            cloudinary_id: null,
            url: img,
            alt_text: `${product.name} image ${index + 1}`,
            is_primary: index === 0,
            sort_order: index,
          };
        } else {
          // img is an object - handle Cloudinary response format
          return {
            product_id: product.id,
            cloudinary_id: img.public_id || img.cloudinaryId || null,
            url: img.secure_url || img.url,
            alt_text: img.altText || `${product.name} image ${index + 1}`,
            is_primary: img.isPrimary || (index === 0),
            sort_order: img.sortOrder || index,
          };
        }
      });
    }

    if (imageInserts.length > 0) {
      logger.info('Inserting images', { imageInserts });
      const { error: imageError } = await supabase
        .from('product_images')
        .insert(imageInserts);

      if (imageError) {
        logger.error('Failed to insert product images', imageError);
        throw imageError; // Throw to fail the request
      } else {
        logger.info('Images inserted successfully', { count: imageInserts.length });
      }
    } else {
      logger.info('No images uploaded');
    }

    // Get product with images
    const { data: productWithImages } = await supabase
      .from('products')
      .select(`
        id, sku, name, slug, description, price, sale_price, stock_quantity,
        size, rim_diameter, load_index, speed_rating, tire_type, is_active, created_at,
        categories(name),
        images:product_images(*)
      `)
      .eq('id', product.id)
      .single();

    // Sort images
    if (productWithImages.images) {
      productWithImages.images = productWithImages.images.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    }

    const formattedProduct = {
      id: productWithImages.id,
      sku: productWithImages.sku,
      name: productWithImages.name,
      slug: productWithImages.slug,
      description: productWithImages.description,
      price: parsedPrice,
      salePrice: parsedSalePrice,
      stockQuantity: productWithImages.stock_quantity,
      size: productWithImages.size,
      rimDiameter: productWithImages.rim_diameter,
      loadIndex: productWithImages.load_index,
      speedRating: productWithImages.speed_rating,
      tireType: productWithImages.tire_type,
      isActive: productWithImages.is_active,
      createdAt: productWithImages.created_at,
      category: {
        name: productWithImages.categories?.name,
      },
      images: productWithImages.images || [],
    };

    logger.info('Product created successfully', { productId: product.id, sku, name, imageCount: imageInserts.length });
    return ApiResponse.created(res, formattedProduct);
  } catch (error) {
    logger.error('Create product failed', error, { sku: req.body.sku, name: req.body.name });
    next(error);
  }
};

exports.getAnalytics = async (req, res, next) => {
  try {
    logger.info('Get analytics API called', { userId: req.user?.id, ip: req.ip });
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    // Orders by day (last 30 days)
    const { data: ordersByDay } = await supabase
      .from('orders')
      .select('created_at, total_amount')
      .gte('created_at', last30Days.toISOString())
      .order('created_at', { ascending: true });

    // Group by date
    const ordersGrouped = ordersByDay?.reduce((acc, order) => {
      const date = new Date(order.created_at).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { _count: 0, _sum: { totalAmount: 0 } };
      }
      acc[date]._count++;
      acc[date]._sum.totalAmount += order.total_amount || 0;
      return acc;
    }, {}) || {};

    const ordersByDayFormatted = Object.entries(ordersGrouped).map(([date, data]) => ({
      createdAt: date,
      _count: data._count,
      _sum: data._sum,
    }));

    // Top products
    const { data: topProductsData } = await supabase
      .from('order_items')
      .select(`
        product_id,
        quantity,
        total_price,
        products(name)
      `)
      .order('quantity', { ascending: false })
      .limit(10);

    const topProducts = topProductsData?.reduce((acc, item) => {
      const existing = acc.find(p => p.productId === item.product_id);
      if (existing) {
        existing._sum.quantity += item.quantity;
        existing._sum.totalPrice += item.total_price;
      } else {
        acc.push({
          productId: item.product_id,
          _sum: {
            quantity: item.quantity,
            totalPrice: item.total_price,
          },
          product: { name: item.products?.name },
        });
      }
      return acc;
    }, []).slice(0, 10) || [];

    // Orders by status
    const { data: ordersByStatusData } = await supabase
      .from('orders')
      .select('status');

    const ordersByStatus = ordersByStatusData?.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {}) || {};

    const ordersByStatusFormatted = Object.entries(ordersByStatus).map(([status, count]) => ({
      status,
      _count: count,
    }));

    logger.info('Analytics data retrieved successfully', {
      ordersByDayCount: ordersByDayFormatted.length,
      topProductsCount: topProducts.length,
      ordersByStatusCount: ordersByStatusFormatted.length
    });
    return ApiResponse.success(res, {
      ordersByDay: ordersByDayFormatted,
      topProducts,
      ordersByStatus: ordersByStatusFormatted,
    });
  } catch (error) {
    logger.error('Get analytics failed', error, { userId: req.user?.id });
    next(error);
  }
};

exports.updateUserStatus = async (req, res, next) => {
  try {
    logger.info('Update user status API called', { targetUserId: req.params.id, isActive: req.body.isActive, adminId: req.user?.id, ip: req.ip });
    const { isActive } = req.body;
    const { data: user, error } = await supabase
      .from('users')
      .update({ is_active: isActive })
      .eq('id', req.params.id)
      .select('id, email, full_name, is_active')
      .single();

    if (error) throw error;

    const formattedUser = {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      isActive: user.is_active,
    };

    logger.info('User status updated successfully', { targetUserId: req.params.id, newStatus: isActive, adminId: req.user?.id });
    return ApiResponse.success(res, formattedUser, 'User status updated');
  } catch (error) {
    logger.error('Update user status failed', error, { targetUserId: req.params.id, adminId: req.user?.id });
    next(error);
  }
};

exports.updateProduct = async (req, res, next) => {
  try {
    logger.info('Update product API called', { productId: req.params.id, sku: req.body.sku, name: req.body.name, adminId: req.user?.id, ip: req.ip });
    const {
      categoryId, sku, name, slug, description, price, salePrice,
      stockQuantity, size, rimDiameter, loadIndex, speedRating, tireType, isActive,
    } = req.body;

    if (!sku || !name || !slug || !price) {
      logger.warn('Update product failed: Missing required fields', { sku, name, slug, price });
      return ApiResponse.error(res, 'SKU, name, slug, and price are required', 400);
    }

    const parsedPrice = parseFloat(price);
    const parsedSalePrice = salePrice ? parseFloat(salePrice) : null;

    // Validate price range (Decimal(12,2) max is 9999999999.99)
    if (parsedPrice < 0 || parsedPrice >= 10000000000) {
      logger.warn('Update product failed: Invalid price', { price: parsedPrice });
      return ApiResponse.error(res, 'Price must be between 0 and 9,999,999,999.99', 400);
    }

    if (parsedSalePrice !== null && (parsedSalePrice < 0 || parsedSalePrice >= 10000000000)) {
      logger.warn('Update product failed: Invalid sale price', { salePrice: parsedSalePrice });
      return ApiResponse.error(res, 'Sale price must be between 0 and 9,999,999,999.99', 400);
    }

    const updateData = {
      category_id: categoryId,
      sku,
      name,
      slug,
      description,
      price: parsedPrice,
      sale_price: parsedSalePrice,
      stock_quantity: parseInt(stockQuantity) || 0,
      size,
      rim_diameter: rimDiameter ? parseInt(rimDiameter) : null,
      load_index: loadIndex,
      speed_rating: speedRating,
      tire_type: tireType,
      is_active: isActive !== undefined ? isActive : true,
    };

    const productService = require('../../../services/product.service');
    const updatedProduct = await productService.update(req.params.id, updateData);

    // Format response similar to getProducts
    const formattedProduct = {
      id: updatedProduct.id,
      sku: updatedProduct.sku,
      name: updatedProduct.name,
      slug: updatedProduct.slug,
      price: updatedProduct.price,
      salePrice: updatedProduct.sale_price,
      stockQuantity: updatedProduct.stock_quantity,
      isActive: updatedProduct.is_active,
      createdAt: updatedProduct.created_at,
      updatedAt: updatedProduct.updated_at,
      category: {
        name: updatedProduct.categories?.name,
      },
      images: updatedProduct.images || [],
    };

    logger.info('Product updated successfully', { productId: req.params.id, sku, name });
    return ApiResponse.success(res, formattedProduct, 'Product updated');
  } catch (error) {
    logger.error('Update product failed', error, { productId: req.params.id });
    next(error);
  }
};

exports.deleteProduct = async (req, res, next) => {
  try {
    logger.info('Delete product API called', { productId: req.params.id, adminId: req.user?.id, ip: req.ip });

    // Get product images first for cleanup
    const { data: images, error: imagesError } = await supabase
      .from('product_images')
      .select('cloudinary_id')
      .eq('product_id', req.params.id);

    if (imagesError) throw imagesError;

    // Delete product (this will cascade delete images due to foreign key)
    const { error: deleteError } = await supabase
      .from('products')
      .delete()
      .eq('id', req.params.id);

    if (deleteError) throw deleteError;

    // Delete images from Cloudinary
    if (images && images.length > 0) {
      const cloudinaryService = require('../../../services/cloudinary.service');
      for (const image of images) {
        if (image.cloudinary_id) {
          try {
            await cloudinaryService.deleteImage(image.cloudinary_id);
            logger.info('Image deleted from Cloudinary', { cloudinaryId: image.cloudinary_id });
          } catch (cloudinaryError) {
            logger.warn('Failed to delete image from Cloudinary', { cloudinaryId: image.cloudinary_id, error: cloudinaryError.message });
          }
        }
      }
    }

    logger.info('Product deleted successfully', { productId: req.params.id, imagesDeleted: images?.length || 0 });
    return ApiResponse.success(res, null, 'Product deleted');
  } catch (error) {
    logger.error('Delete product failed', error, { productId: req.params.id });
    next(error);
  }
};
