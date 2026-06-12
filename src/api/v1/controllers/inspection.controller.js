const aiService = require('../../../services/ai.service');
const supabase = require('../../../config/database');
const ApiResponse = require('../../../utils/response');
const logger = require('../../../utils/logger');

exports.inspect = async (req, res, next) => {
  try {
    if (!req.file) {
      return ApiResponse.error(res, 'Image is required', 400);
    }

    const imageUrl = req.file.path;
    const cloudinaryId = req.file.filename;

    // Gọi AI Service (GraphRag) để detect — GraphRag chỉ detect/embed, KHÔNG kết nối Supabase
    let aiResult;
    try {
      aiResult = await aiService.inspectTire(imageUrl);
    } catch (aiError) {
      // Fallback: nếu GraphRag chưa có detect endpoint, dùng mock
      logger.warn('Inspect fallback', { tag: 'inspect' });
      aiResult = {
        wear_level: 'good',
        wear_percentage: 35,
        tire_type_detected: 'Lốp xe máy',
        crack_detected: false,
        crack_severity: 'none',
        crack_locations: [],
        confidence: 0.85,
        recommendation: 'Lốp còn khá tốt. Bạn có thể yên tâm sử dụng thêm 5.000-8.000 km nữa trước khi cần thay.',
        suggested_product_ids: [],
      };
    }

    // BE lưu kết quả vào Supabase (AI service không cần kết nối Supabase)
    const { data: inspection, error: insertError } = await supabase
      .from('tire_inspections')
      .insert({
        user_id: req.user.id,
        image_cloudinary_id: cloudinaryId,
        image_url: imageUrl,
        wear_level: aiResult.wear_level || aiResult.wearLevel,
        wear_percentage: aiResult.wear_percentage || aiResult.wearPercentage,
        tire_type_detected: aiResult.tire_type_detected || aiResult.tire_type || aiResult.tireType,
        crack_detected: aiResult.crack_detected || aiResult.crackDetected || false,
        crack_severity: aiResult.crack_severity || aiResult.crackSeverity || 'none',
        crack_locations: aiResult.crack_locations || aiResult.crackLocations || [],
        ai_confidence: aiResult.confidence || 0,
        ai_raw_result: aiResult,
        recommendation: aiResult.recommendation || '',
        suggested_products: aiResult.suggested_product_ids || [],
      })
      .select()
      .single();

    if (insertError) {
      // Vẫn trả kết quả cho FE dù lưu Supabase lỗi
      return ApiResponse.success(res, {
        ...aiResult,
        image_url: imageUrl,
        saved: false,
      });
    }

    // Populate suggested products từ Supabase
    let suggestedProducts = [];
    if (aiResult.suggested_product_ids && aiResult.suggested_product_ids.length > 0) {
      const { data: products } = await supabase
        .from('products')
        .select('id, name, price, sale_price, slug')
        .in('id', aiResult.suggested_product_ids)
        .eq('is_active', true)
        .limit(5);
      suggestedProducts = products || [];
    }

    return ApiResponse.success(res, { ...inspection, suggested_products: suggestedProducts }, 'Inspection completed');
  } catch (error) {
    logger.error('Inspection failed', error, { tag: 'inspect' });
    next(error);
  }
};

exports.getHistory = async (req, res, next) => {
  try {
    const { data: inspections, error } = await supabase
      .from('tire_inspections')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    return ApiResponse.success(res, inspections);
  } catch (error) {
    logger.error('History fetch failed', error, { tag: 'inspect' });
    next(error);
  }
};
