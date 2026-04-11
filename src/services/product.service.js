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
      // Get category id by slug
      const { data: category } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', query.category)
        .single();
      if (category) {
        supabaseQuery = supabaseQuery.eq('category_id', category.id);
      } else {
        // No category found, return empty
        return { products: [], pagination: getPaginationMeta(0, page, limit) };
      }
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
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
          .slice(0, 3);
      }
    });

    return {
      products,
      pagination: getPaginationMeta(count, page, limit),
    };
  }

  async getById(id) {
    const { data: product, error } = await supabase
      .from('products')
      .select(`
        *,
        category:categories(*),
        images:product_images(*)
      `)
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error || !product) {
      throw Object.assign(new Error('Product not found'), { statusCode: 404 });
    }

    // Sort images
    if (product.images) {
      product.images = product.images.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    }

    return product;
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
      product.images = product.images.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
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
    const { data, error } = await supabase
      .from('product_images')
      .insert(images.map((img) => ({
        product_id: productId,
        cloudinary_id: img.cloudinaryId,
        url: img.url,
        alt_text: img.altText,
        is_primary: img.isPrimary || false,
        sort_order: img.sortOrder || 0,
      })));

    if (error) {
      throw new Error(`Failed to add images: ${error.message}`);
    }

    return data;
  }

  async deleteImage(imageId) {
    const { error } = await supabase
      .from('product_images')
      .delete()
      .eq('id', imageId);

    if (error) {
      throw new Error(`Failed to delete image: ${error.message}`);
    }
  }
}

module.exports = new ProductService();
