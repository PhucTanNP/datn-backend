const supabase = require('../config/database');
const { getPagination, getPaginationMeta } = require('../utils/pagination');

// Helper: chuyển snake_case → camelCase
const toCamelCase = (obj) => {
  if (Array.isArray(obj)) return obj.map(toCamelCase);
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      acc[camelKey] = toCamelCase(obj[key]);
      return acc;
    }, {});
  }
  return obj;
};

class CategoriesService {
  async getAll(query = {}) {
    const { page, limit, skip } = getPagination(query);

    let supabaseQuery = supabase
      .from('categories')
      .select('*', { count: 'exact' })
      .range(skip, skip + limit - 1);

    // Filters
    if (query.search) {
      supabaseQuery = supabaseQuery.ilike('name', `%${query.search}%`);
    }

    // Sort
    supabaseQuery = supabaseQuery.order('created_at', { ascending: false });

    const { data: categories, error, count } = await supabaseQuery;

    if (error) {
      throw new Error(`Failed to fetch categories: ${error.message}`);
    }

    const pagination = getPaginationMeta(count, page, limit);

    return { categories: categories.map(toCamelCase), pagination };
  }

  async getById(id) {
    const { data: category, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(`Failed to fetch category: ${error.message}`);
    }

    return toCamelCase(category);
  }

  async create(data) {
    const { data: category, error } = await supabase
      .from('categories')
      .insert(data)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create category: ${error.message}`);
    }

    return toCamelCase(category);
  }

  async update(id, data) {
    const { data: category, error } = await supabase
      .from('categories')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update category: ${error.message}`);
    }

    return toCamelCase(category);
  }

  async delete(id) {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete category: ${error.message}`);
    }
  }
}

module.exports = new CategoriesService();