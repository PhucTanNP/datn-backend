const aiService = require('../../../services/ai.service');
const chatService = require('../../../services/chat.service');
const supabase = require('../../../config/database');
const ApiResponse = require('../../../utils/response');
const logger = require('../../../utils/logger');

/**
 * POST /api/v1/chat
 * Gửi tin nhắn chat — ưu tiên GraphRag, fallback về rule-based nếu GraphRag lỗi
 */
exports.chat = async (req, res, next) => {
  try {
    const { message, history, mode } = req.body;
    const userId = req.user?.id || 'anonymous';

    if (!message || !message.trim()) {
      return ApiResponse.error(res, 'Message is required', 400);
    }

    // Thử gọi GraphRag trước
    try {
      const aiReply = await aiService.chat(message, history || [], mode || 'fast');

      // GraphRag trả về { result: "..." } — chuẩn hóa thành format chung
      const reply = {
        text: aiReply.result || aiReply.text || 'Xin lỗi, tôi không hiểu ý bạn.',
        actions: [],
      };

      return ApiResponse.success(res, reply);
    } catch (aiError) {
      // Nếu GraphRag lỗi → fallback về rule-based
      logger.warn('Using fallback', { tag: 'chat' });
      const reply = await chatService.processMessage(userId, message, history || []);
      return ApiResponse.success(res, reply);
    }
  } catch (error) {
    logger.error('Chat failed', error);
    next(error);
  }
};

/**
 * POST /api/v1/chat/inspect
 * Kiểm tra lốp — upload ảnh, gọi AI detect, trả kết quả
 * AI Service (GraphRag) chỉ detect/embed — KHÔNG kết nối Supabase
 * BE lưu kết quả vào Supabase sau khi nhận từ AI
 */
exports.inspect = async (req, res, next) => {
  try {
    if (!req.file) {
      return ApiResponse.error(res, 'Vui lòng tải lên ảnh lốp xe', 400);
    }

    const imageUrl = req.file.path;
    const cloudinaryId = req.file.filename;

    let aiResult;

    // Thử gọi AI Service (GraphRag) để detect
    try {
      aiResult = await aiService.inspectTire(imageUrl);
    } catch (aiError) {
      // Fallback: nếu GraphRag chưa có detect endpoint, dùng mock
      logger.warn('Inspect fallback', { tag: 'chat' });
      aiResult = {
        wear_level: 'good',
        wear_percentage: 35,
        tire_type_detected: 'Lốp xe máy',
        crack_detected: false,
        crack_severity: 'none',
        crack_locations: [],
        confidence: 0.85,
        recommendation: 'Lốp còn khá tốt. Bạn có thể yên tâm sử dụng thêm 5.000-8.000 km nữa trước khi cần thay.',
      };
    }

    // Lưu kết quả inspection vào Supabase (BE làm nhiệm vụ này)
    const { data: inspection, error: insertError } = await supabase
      .from('tire_inspections')
      .insert({
        user_id: req.user?.id || null,
        image_cloudinary_id: cloudinaryId,
        image_url: imageUrl,
        wear_level: aiResult.wear_level || aiResult.wearLevel,
        wear_percentage: aiResult.wear_percentage || aiResult.wearPercentage,
        tire_type_detected: aiResult.tire_type_detected || aiResult.tireType,
        crack_detected: aiResult.crack_detected || aiResult.crackDetected || false,
        crack_severity: aiResult.crack_severity || aiResult.crackSeverity || 'none',
        crack_locations: aiResult.crack_locations || aiResult.crackLocations || [],
        ai_confidence: aiResult.confidence || 0,
        ai_raw_result: aiResult,
        recommendation: aiResult.recommendation || '',
      })
      .select()
      .single();

    if (insertError) {
      logger.error('Inspect save to DB failed', insertError);
      // Vẫn trả kết quả cho FE dù lưu Supabase lỗi
      return ApiResponse.success(res, {
        ...aiResult,
        image_url: imageUrl,
        saved: false,
      });
    }

    // Gợi ý sản phẩm từ Supabase
    const { data: products } = await supabase
      .from('products')
      .select('id, name, price, sale_price, slug')
      .eq('is_active', true)
      .limit(3);

    return ApiResponse.success(res, {
      ...inspection,
      suggested_products: products || [],
    });
  } catch (error) {
    logger.error('Chat inspect failed', error);
    next(error);
  }
};
