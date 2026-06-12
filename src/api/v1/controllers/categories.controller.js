const categoriesService = require('../../../services/categories.service');
const ApiResponse = require('../../../utils/response');
const logger = require('../../../utils/logger');

exports.getAll = async (req, res, next) => {
  try {
    const { categories, pagination } = await categoriesService.getAll(req.query);
    return ApiResponse.paginated(res, categories, pagination);
  } catch (error) {
    logger.error('Get all categories failed', error, { query: req.query });
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const category = await categoriesService.getById(req.params.id);
    return ApiResponse.success(res, category);
  } catch (error) {
    logger.error('Get category by ID failed', error, { id: req.params.id });
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { name, slug, description, imageUrl, parentId } = req.body;

    if (!name || !slug) {
      logger.warn('Missing name/slug', { tag: 'category' });
      return ApiResponse.error(res, 'Name and slug are required', 400);
    }

    const category = await categoriesService.create({
      name,
      slug,
      description,
      imageUrl,
      parentId,
    });

    return ApiResponse.created(res, category);
  } catch (error) {
    logger.error('Create category failed', error, { name: req.body.name });
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const category = await categoriesService.update(req.params.id, req.body);
    return ApiResponse.success(res, category, 'Category updated');
  } catch (error) {
    logger.error('Update category failed', error, { categoryId: req.params.id });
    next(error);
  }
};

exports.delete = async (req, res, next) => {
  try {
    await categoriesService.delete(req.params.id);
    return ApiResponse.success(res, null, 'Category deleted');
  } catch (error) {
    logger.error('Delete category failed', error, { categoryId: req.params.id });
    next(error);
  }
};