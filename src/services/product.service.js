const supabase = require('../config/database');
const { getPagination, getPaginationMeta } = require('../utils/pagination');

class ProductService {
  async getAll(query) {
    const { page, limit, skip } = getPagination(query);

    let supabaseQuery = supabase
      .from('products')
      .select(`
        *,
        category:categories(id, name, slug),
        images:product_images(*)
      `, { count: 'exact' })
      .eq('is_active', true)
      .range(skip, skip + limit - 1);

    // Filters
    if (query.category) {
      supabaseQuery = supabaseQuery.eq('categories.slug', query.category);
    }
    if (query.tireType) {
      supabaseQuery = supabaseQuery.ilike('tire_type', `%${query.tireType}%`);
    }
    if (query.size) {
      supabaseQuery = supabaseQuery.ilike('size', `%${query.size}%`);
    }
    if (query.minPrice) {
      supabaseQuery = supabaseQuery.gte('price', parseFloat(query.minPrice));
    }
    if (query.maxPrice) {
      supabaseQuery = supabaseQuery.lte('price', parseFloat(query.maxPrice));
    }
    if (query.search) {
      supabaseQuery = supabaseQuery.or(`name.ilike.%${query.search}%,sku.ilike.%${query.search}%,description.ilike.%${query.search}%`);
    }

    // Sort
    let orderBy = 'created_at.desc';
    if (query.sort) {
      const [field, direction] = query.sort.split(':');
      const allowedFields = ['price', 'name', 'created_at'];
      if (allowedFields.includes(field)) {
        orderBy = `${field}.${direction === 'asc' ? 'asc' : 'desc'}`;
      }
    }
    supabaseQuery = supabaseQuery.order(orderBy);

    const { data: products, error, count } = await supabaseQuery;

    if (error) throw error;

    // Process images (take first 3, sorted by sort_order)
    products.forEach(product => {
      if (product.images) {
        product.images = product.images
          .sort((a, b) => a.sort_order - b.sort_order)
          .slice(0, 3);
      }
    });

    return {
      products,
      pagination: getPaginationMeta(count, page, limit),
    };
  }

  async getBySlug(slug) {
    const { data: product, error } = await supabase
      .from('products')
      .select(`
        *,
        category:categories(*),
        images:product_images(*)
      `)
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (error || !product) {
      throw Object.assign(new Error('Product not found'), { statusCode: 404 });
    }

    // Sort images
    if (product.images) {
      product.images = product.images.sort((a, b) => a.sort_order - b.sort_order);
    }

    return product;
  }

  async create(data) {
    const { data: product, error } = await supabase
      .from('products')
      .insert(data)
      .select(`
        *,
        category:categories(*),
        images:product_images(*)
      `)
      .single();

    if (error) throw error;
    return product;
  }

  async update(id, data) {
    const { data: product, error } = await supabase
      .from('products')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(`
        *,
        category:categories(*),
        images:product_images(*)
      `)
      .single();

    if (error) throw error;
    return product;
  }

  async delete(id) {
    const { data, error } = await supabase
      .from('products')
      .update({ is_active: false })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
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
