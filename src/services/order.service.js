const prisma = require('../config/database');
const generateOrderNumber = require('../utils/generateOrderNumber');
const { getPagination, getPaginationMeta } = require('../utils/pagination');

class OrderService {
  async create(userId, { items, shippingName, shippingPhone, shippingAddress, notes }) {
    // Validate products & calculate totals
    const productIds = items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true },
      include: { images: { where: { isPrimary: true }, take: 1 } },
    });

    if (products.length !== items.length) {
      throw Object.assign(new Error('Some products not found or inactive'), { statusCode: 400 });
    }

    const productMap = {};
    products.forEach((p) => { productMap[p.id] = p; });

    let subtotal = 0;
    const orderItems = items.map((item) => {
      const product = productMap[item.productId];
      if (product.stockQuantity < item.quantity) {
        throw Object.assign(
          new Error(`Insufficient stock for ${product.name}`),
          { statusCode: 400 }
        );
      }

      const unitPrice = product.salePrice || product.price;
      const totalPrice = unitPrice * item.quantity;
      subtotal += Number(totalPrice);

      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice,
        totalPrice,
        snapshot: {
          name: product.name,
          sku: product.sku,
          size: product.size,
          image: product.images[0]?.url,
        },
      };
    });

    const shippingFee = subtotal >= 500000 ? 0 : 30000; // Free ship trên 500k
    const totalAmount = subtotal + shippingFee;
    const orderNumber = await generateOrderNumber(prisma);

    // Create order in transaction
    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          userId,
          orderNumber,
          subtotal,
          shippingFee,
          totalAmount,
          shippingName,
          shippingPhone,
          shippingAddress,
          notes,
          items: { create: orderItems },
        },
        include: { items: true },
      });

      // Update stock
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stockQuantity: { decrement: item.quantity } },
        });
      }

      return newOrder;
    });

    return order;
  }

  async getMyOrders(userId, query) {
    const { page, limit, skip } = getPagination(query);

    const where = { userId };
    if (query.status) where.status = query.status;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: {
            include: { product: { select: { name: true, slug: true } } },
          },
          payments: { select: { method: true, status: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    return { orders, pagination: getPaginationMeta(total, page, limit) };
  }

  async getAllOrders(query) {
    const { page, limit, skip } = getPagination(query);

    const where = {};
    if (query.status) where.status = query.status;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          user: { select: { fullName: true, email: true, phone: true } },
          items: true,
          payments: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    return { orders, pagination: getPaginationMeta(total, page, limit) };
  }

  async updateStatus(orderId, status) {
    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
    if (!validStatuses.includes(status)) {
      throw Object.assign(new Error('Invalid status'), { statusCode: 400 });
    }

    return prisma.order.update({
      where: { id: orderId },
      data: { status },
      include: { items: true, payments: true },
    });
  }
}

module.exports = new OrderService();
