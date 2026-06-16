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

    // Gọi GraphRag detect — trả brand/size/pattern + steps
    let aiResult;
    let aiSteps = [];
    try {
      const raw = await aiService.inspectTire(imageUrl);
      aiResult = raw.data || raw; // { brand, size, pattern, brand_ocr, ... }
      aiSteps = raw.steps || [];  // steps ở ngoài cùng của DetectResponse
    } catch (aiError) {
      logger.warn('Inspect fallback', { tag: 'inspect' });
      aiResult = {
        success: true,
        brand: null,
        size: null,
        pattern: null,
        brand_ocr: null,
        size_ocr: null,
        pattern_ocr: null,
        detections_count: 0,
      };
      aiSteps = [];
    }

    // BE lưu kết quả vào Supabase
    const { data: inspection, error: insertError } = await supabase
      .from('tire_inspections')
      .insert({
        user_id: req.user.id,
        image_cloudinary_id: cloudinaryId,
        image_url: imageUrl,
        brand: aiResult.brand || null,
        size: aiResult.size || null,
        pattern: aiResult.pattern || null,
        brand_raw: aiResult.brand_ocr?.raw_text || null,
        size_raw: aiResult.size_ocr?.raw_text || null,
        pattern_raw: aiResult.pattern_ocr?.raw_text || null,
        ocr_confidence: aiResult.brand_ocr?.ocr_confidence || 0,
        yolo_confidence: aiResult.brand_ocr?.yolo_confidence || 0,
        detections_count: aiResult.detections_count || 0,
        ai_raw_result: { ...aiResult, steps: aiSteps },
      })
      .select()
      .single();

    if (insertError) {
      return ApiResponse.success(res, {
        ...aiResult,
        image_url: imageUrl,
        saved: false,
        steps: aiSteps,
      });
    }

    return ApiResponse.success(res, {
      ...inspection,
      brand_ocr: aiResult.brand_ocr || null,
      size_ocr: aiResult.size_ocr || null,
      pattern_ocr: aiResult.pattern_ocr || null,
      steps: aiSteps,
    }, 'Inspection completed');
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
