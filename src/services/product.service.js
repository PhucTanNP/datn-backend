const prisma = require('../config/database');
const { getPagination, getPaginationMeta } = require('../utils/pagination');

class ProductService {
  async getAll(query) {
    const { page, limit, skip } = getPagination(query);

    const where = { isActive: true };

    // Filters
    if (query.category) {
      where.category = { slug: query.category };
    }
    if (query.tireType) {
      where.tireType = query.tireType;
    }
    if (query.size) {
      where.size = { contains: query.size, mode: 'insensitive' };
    }
    if (query.minPrice || query.maxPrice) {
      where.price = {};
      if (query.minPrice) where.price.gte = parseFloat(query.minPrice);
      if (query.maxPrice) where.price.lte = parseFloat(query.maxPrice);
    }
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { sku: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // Sort
    let orderBy = { createdAt: 'desc' };
    if (query.sort) {
      const [field, direction] = query.sort.split(':');
      const allowedFields = ['price', 'name', 'createdAt'];
      if (allowedFields.includes(field)) {
        orderBy = { [field]: direction === 'asc' ? 'asc' : 'desc' };
      }
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          images: { orderBy: { sortOrder: 'asc' }, take: 3 },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    return {
      products,
      pagination: getPaginationMeta(total, page, limit),
    };
  }

  async getBySlug(slug) {
    const product = await prisma.product.findUnique({
      where: { slug },
      include: {
        category: true,
        images: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!product || !product.isActive) {
      throw Object.assign(new Error('Product not found'), { statusCode: 404 });
    }

    return product;
  }

  async create(data) {
    return prisma.product.create({
      data,
      include: { category: true, images: true },
    });
  }

  async update(id, data) {
    return prisma.product.update({
      where: { id },
      data: { ...data, updatedAt: new Date() },
      include: { category: true, images: true },
    });
  }

  async delete(id) {
    return prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async addImages(productId, images) {
    return prisma.productImage.createMany({
      data: images.map((img) => ({
        productId,
        cloudinaryId: img.cloudinaryId,
        url: img.url,
        altText: img.altText,
        isPrimary: img.isPrimary || false,
        sortOrder: img.sortOrder || 0,
      })),
    });
  }

  async deleteImage(imageId) {
    return prisma.productImage.delete({ where: { id: imageId } });
  }
}

module.exports = new ProductService();
