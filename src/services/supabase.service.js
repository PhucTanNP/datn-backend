const { createClient } = require('@supabase/supabase-js');

const supabase = require('../config/supabase');
const cloudinary = require('../config/cloudinary');

class SupabaseService {
  async uploadFile(file, bucket = 'drc-tires') {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(`products/${Date.now()}_${file.originalname}`, file.buffer, {
        contentType: file.mimetype,
      });

    if (error) throw error;
    return data;
  }

  async deleteFile(path, bucket = 'drc-tires') {
    const { data, error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) throw error;
    return data;
  }

  getPublicUrl(path, bucket = 'drc-tires') {
    const { publicURL } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return publicURL;
  }

  // Products CRUD
  async createProduct(productData, images = []) {
    const { data: product, error } = await supabase
      .from('products')
      .insert(productData)
      .select('id')
      .single();
    if (error) throw error;

    // Upload images to Cloudinary & insert product_images
    for (const img of images) {
      const cloudResult = await cloudinary.uploader.upload_stream(
        { folder: 'drc-tires/products' },
        async (error, result) => {
          if (error) throw error;
          await supabase.from('product_images').insert({
            product_id: product.id,
            cloudinary_id: result.public_id,
            url: result.secure_url,
            alt_text: productData.name,
            is_primary: images.indexOf(img) === 0,
          });
        }
      );
      cloudResult.end(img.buffer);
      await new Promise(r => cloudResult.on('finish', r));
    }

    return product;
  }

  async getProducts(filter = {}) {
    return supabase.from('products').select('*').eq('id', filter.id || '').limit(filter.limit || 100);
  }

  async updateProduct(id, updates) {
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select();
    if (error) throw error;
    return data[0];
  }

  async deleteProduct(id) {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
    return true;
  }

  // Bulk
  async bulkCreateProducts(products) {
    const { data, error } = await supabase.from('products').insert(products);
    if (error) throw error;
    return data;
  }

  // Categories CRUD (tương tự)
  async createCategory(data) {
    return supabase.from('categories').insert(data).select();
  }

  async getCategories() {
    return supabase.from('categories').select('*');
  }
}

module.exports = new SupabaseService();