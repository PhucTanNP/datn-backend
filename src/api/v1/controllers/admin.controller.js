const prisma = require('../../../config/database');
const ApiResponse = require('../../../utils/response');
const { getPagination, getPaginationMeta } = require('../../../utils/pagination');

exports.getDashboard = async (req, res, next) => {
  try {
    const [totalUsers, totalProducts, totalOrders, recentOrders, revenue] = await Promise.all([
      prisma.user.count({ where: { role: 'customer' } }),
      prisma.product.count({ where: { isActive: true } }),
      prisma.order.count(),
      prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { fullName: true, email: true } },
        },
      }),
      prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { status: { in: ['confirmed', 'processing', 'shipped', 'delivered'] } },
      }),
    ]);

    return ApiResponse.success(res, {
      stats: {
        totalUsers,
        totalProducts,
        totalOrders,
        totalRevenue: revenue._sum.totalAmount || 0,
      },
      recentOrders,
    });
  } catch (error) {
    next(error);
  }
};

exports.getUsers = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true, email: true, fullName: true, phone: true,
          role: true, isActive: true, createdAt: true,
          _count: { select: { orders: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count(),
    ]);

    return ApiResponse.paginated(res, users, getPaginationMeta(total, page, limit));
  } catch (error) {
    next(error);
  }
};

exports.getAnalytics = async (req, res, next) => {
  try {
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const [ordersByDay, topProducts, ordersByStatus] = await Promise.all([
      prisma.order.groupBy({
        by: ['createdAt'],
        _count: true,
        _sum: { totalAmount: true },
        where: { createdAt: { gte: last30Days } },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.orderItem.groupBy({
        by: ['productId'],
        _sum: { quantity: true, totalPrice: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 10,
      }),
      prisma.order.groupBy({
        by: ['status'],
        _count: true,
      }),
    ]);

    return ApiResponse.success(res, {
      ordersByDay,
      topProducts,
      ordersByStatus,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateUserStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body;
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive },
      select: { id: true, email: true, fullName: true, isActive: true },
    });
    return ApiResponse.success(res, user, 'User status updated');
  } catch (error) {
    next(error);
  }
};
