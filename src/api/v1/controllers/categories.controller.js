const categoriesService = require('../../../services/categories.service');
const ApiResponse = require('../../../utils/response');
const logger = require('../../../utils/logger');

exports.getAll = async (req, res, next) => {
  try {
    logger.info('Get all categories API called', { query: req.query, ip: req.ip });
    const { categories, pagination } = await categoriesService.getAll(req.query);
    logger.info('Categories retrieved successfully', { count: categories.length, pagination });
    return ApiResponse.paginated(res, categories, pagination);
  } catch (error) {
    logger.error('Get all categories failed', error, { query: req.query });
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    logger.info('Get category by ID API called', { id: req.params.id, ip: req.ip });
    const category = await categoriesService.getById(req.params.id);
    logger.info('Category retrieved successfully', { categoryId: category.id });
    return ApiResponse.success(res, category);
  } catch (error) {
    logger.error('Get category by ID failed', error, { id: req.params.id });
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    logger.info('Create category API called', { name: req.body.name, userId: req.user?.id, ip: req.ip });
    const { name, slug, description, imageUrl, parentId } = req.body;

    if (!name || !slug) {
      logger.warn('Create category failed: Missing required fields', { name, slug });
      return ApiResponse.error(res, 'Name and slug are required', 400);
    }

    const category = await categoriesService.create({
      name,
      slug,
      description,
      imageUrl,
      parentId,
    });

    logger.info('Category created successfully', { categoryId: category.id, name });
    return ApiResponse.created(res, category);
  } catch (error) {
    logger.error('Create category failed', error, { name: req.body.name });
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    logger.info('Update category API called', { categoryId: req.params.id, userId: req.user?.id, ip: req.ip });
    const category = await categoriesService.update(req.params.id, req.body);
    logger.info('Category updated successfully', { categoryId: req.params.id });
    return ApiResponse.success(res, category, 'Category updated');
  } catch (error) {
    logger.error('Update category failed', error, { categoryId: req.params.id });
    next(error);
  }
};

exports.delete = async (req, res, next) => {
  try {
    logger.info('Delete category API called', { categoryId: req.params.id, userId: req.user?.id, ip: req.ip });
    await categoriesService.delete(req.params.id);
    logger.info('Category deleted successfully', { categoryId: req.params.id });
    return ApiResponse.success(res, null, 'Category deleted');
  } catch (error) {
    logger.error('Delete category failed', error, { categoryId: req.params.id });
    next(error);
  }
};