const aiService = require('../../../services/ai.service');
const supabase = require('../../../config/database');
const ApiResponse = require('../../../utils/response');
const logger = require('../../../utils/logger');

exports.inspect = async (req, res, next) => {
  try {
    logger.info('Tire inspection API called', { userId: req.user.id, hasFile: !!req.file, ip: req.ip });
    if (!req.file) {
      logger.warn('Tire inspection failed: No image uploaded', { userId: req.user.id });
      return ApiResponse.error(res, 'Image is required', 400);
    }

    const imageUrl = req.file.path;
    const cloudinaryId = req.file.filename;

    // Call AI service
    logger.info('Calling AI service for tire inspection', { userId: req.user.id, imageUrl });
    const aiResult = await aiService.inspectTire(imageUrl);

    // Save inspection result
    const { data: inspection, error: insertError } = await supabase
      .from('tire_inspections')
      .insert({
        user_id: req.user.id,
        image_cloudinary_id: cloudinaryId,
        image_url: imageUrl,
        wear_level: aiResult.wear_level,
        wear_percentage: aiResult.wear_percentage,
        tire_type_detected: aiResult.tire_type,
        crack_detected: aiResult.crack_detected || false,
        crack_severity: aiResult.crack_severity || 'none',
        crack_locations: aiResult.crack_locations || [],
        ai_confidence: aiResult.confidence,
        ai_raw_result: aiResult,
        recommendation: aiResult.recommendation,
        suggested_products: aiResult.suggested_product_ids || [],
      })
      .select()
      .single();

    if (insertError) throw insertError;

    logger.info('Tire inspection completed successfully', {
      inspectionId: inspection.id,
      userId: req.user.id,
      wearLevel: aiResult.wear_level,
      crackDetected: aiResult.crack_detected
    });
    return ApiResponse.success(res, inspection, 'Inspection completed');
  } catch (error) {
    logger.error('Tire inspection failed', error, { userId: req.user.id });
    next(error);
  }
};

exports.getHistory = async (req, res, next) => {
  try {
    logger.info('Get inspection history API called', { userId: req.user.id, ip: req.ip });
    const { data: inspections, error } = await supabase
      .from('tire_inspections')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    logger.info('Inspection history retrieved successfully', { userId: req.user.id, count: inspections.length });
    return ApiResponse.success(res, inspections);
  } catch (error) {
    logger.error('Get inspection history failed', error, { userId: req.user.id });
    next(error);
  }
};
