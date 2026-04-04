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
      totalOrders,
      totalRevenue
    });
    return ApiResponse.success(res, {
      stats: {
        totalUsers,
        totalProducts,
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
