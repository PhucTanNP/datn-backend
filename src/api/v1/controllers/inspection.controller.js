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

// ═══════════════════════════════════════════════════════════════════════════
//  SCAN (2 mặt 1 lốp → merge detect → chọn xe → recommend tất cả mã gai)
//  ═══════════════════════════════════════════════════════════════════════════

/**
 * Merge kết quả detect từ 2 mặt của cùng 1 lốp.
 * Ưu tiên field có ocr_confidence cao hơn.
 */
function mergeDetectResults(results) {
  const sides = results.filter(r => r && r.success !== false);
  if (sides.length === 0) return null;
  if (sides.length === 1) return sides[0];

  // Merge: ưu tiên giá trị có confidence cao hơn
  const merged = { ...sides[0] };
  for (let i = 1; i < sides.length; i++) {
    const s = sides[i];
    for (const field of ['brand', 'size', 'pattern']) {
      const curConf = merged[`${field}_ocr`]?.ocr_confidence || 0;
      const newConf = s[`${field}_ocr`]?.ocr_confidence || 0;
      if (newConf > curConf && s[field]) {
        merged[field] = s[field];
        merged[`${field}_raw`] = s[`${field}_raw`];
        merged[`${field}_ocr`] = s[`${field}_ocr`];
      }
    }
    // Cộng dồn detections_count
    merged.detections_count = (merged.detections_count || 0) + (s.detections_count || 0);
    // Gộp steps
    if (s.steps) {
      merged.steps = [...(merged.steps || []), ...s.steps.map(st => ({ ...st, side: i + 1 }))];
    }
  }
  // Confidence tổng = trung bình cộng
  const confs = sides.map(s => s.ocr_confidence || 0).filter(c => c > 0);
  merged.ocr_confidence = confs.length > 0
    ? confs.reduce((a, b) => a + b, 0) / confs.length
    : 0;

  merged.sides_count = sides.length;
  return merged;
}

exports.scan = async (req, res, next) => {
  try {
    const files = req.files;
    if (!files || (!files.sideA && !files.sideB)) {
      return ApiResponse.error(res, 'Cần ít nhất 1 ảnh mặt lốp (sideA)', 400);
    }

    const sideAFiles = files.sideA || [];
    const sideBFiles = files.sideB || [];
    const imageUrls = [];

    if (sideAFiles[0]) imageUrls.push({ side: 'A', url: sideAFiles[0].path });
    if (sideBFiles[0]) imageUrls.push({ side: 'B', url: sideBFiles[0].path });

    // Bước 1: Detect từng mặt qua GraphRag
    const detectResults = [];
    for (const { side, url } of imageUrls) {
      try {
        const raw = await aiService.inspectTire(url);
        detectResults.push({ side, ...(raw.data || raw), success: true });
      } catch (err) {
        logger.warn(`Scan detect side ${side} failed`, { error: err.message, tag: 'scan' });
        detectResults.push({ side, success: false, error: err.message });
      }
    }

    // Bước 2: Merge kết quả detect
    const merged = mergeDetectResults(detectResults);
    if (!merged) {
      return ApiResponse.success(res, {
        success: false,
        error: 'Không thể detect thông số từ ảnh',
        sides: detectResults,
      });
    }

    const size = merged.size || null;
    let pattern = merged.pattern || null;
    // Chuẩn hoá pattern: tự động thêm tiền tố D nếu thiếu
    if (pattern && !/^D/i.test(pattern)) {
      pattern = 'D' + pattern;
      logger.info(`Pattern normalized: thêm D → ${pattern}`);
    }

    // Bước 3: Route theo 3 case
    let products = [];
    let vehicles = null;
    let recommend = null;
    let caseType = null; // 'size_pattern' | 'size_only' | 'pattern_only' | 'none'
    let frontSize = null;
    let rearSize = null;

    if (size && pattern) {
      // ═══ CASE 1: Có size + pattern → query Supabase trực tiếp, ko cần xe ═══
      caseType = 'size_pattern';
      logger.info(`CASE 1: size=${size}, pattern=${pattern} — query Supabase`);

      const { data: dbProducts } = await supabase
        .from('products')
        .select('id, name, brand, price, sale_price, slug, size, pattern, product_type, stock_quantity, has_tube, images:product_images(url)')
        .eq('size', size)
        .eq('pattern', pattern)
        .eq('is_active', true);

      products = (dbProducts || []).map(p => ({
        id: p.id,
        name: p.name,
        brand: p.brand,
        price: p.price,
        sale_price: p.sale_price,
        slug: p.slug,
        size: p.size,
        pattern: p.pattern,
        tire_type: p.product_type,
        stock_quantity: p.stock_quantity,
        has_tube: p.has_tube,
        image_url: p.images?.[0]?.url || null,
      }));

    } else if (size && !pattern) {
      // ═══ CASE 2: Chỉ có size ═══
      caseType = 'size_only';
      const vehNameCase2 = req.body.vehicle_name || null;
      logger.info(`CASE 2: size=${size} vehicle_name=${vehNameCase2 || '(none)'}`);

      if (vehNameCase2) {
        // Có vehicle_name → recommend từ GraphRag
        try {
          const recRes = await aiService.recommendByVehicle(vehNameCase2);
          recommend = recRes;
          frontSize = recRes.front_size || null;
          rearSize = recRes.rear_size || null;
        } catch (recErr) {
          logger.warn('Recommend by vehicle failed (CASE 2)', { error: recErr.message, tag: 'scan' });
        }
      } else {
        // Không có vehicle_name → query Supabase tất cả pattern + vehicles từ Neo4j
        const { data: dbProducts } = await supabase
          .from('products')
          .select('id, name, brand, price, sale_price, slug, size, pattern, product_type, stock_quantity, has_tube, images:product_images(url)')
          .eq('size', size)
          .eq('is_active', true);

        products = (dbProducts || []).map(p => ({
          id: p.id, name: p.name, brand: p.brand,
          price: p.price, sale_price: p.sale_price, slug: p.slug,
          size: p.size, pattern: p.pattern, tire_type: p.product_type,
          stock_quantity: p.stock_quantity, has_tube: p.has_tube,
          image_url: p.images?.[0]?.url || null,
        }));

        try {
          const vehRes = await aiService.getVehiclesBySize(size);
          vehicles = vehRes.vehicles || [];
        } catch (vehErr) {
          logger.warn('Get vehicles by size failed (CASE 2)', { error: vehErr.message, tag: 'scan' });
          vehicles = [];
        }
      }

    } else if (!size && pattern) {
      // ═══ CASE 3: Chỉ có pattern ═══
      caseType = 'pattern_only';
      const vehNameCase3 = req.body.vehicle_name || null;
      logger.info(`CASE 3: pattern=${pattern} vehicle_name=${vehNameCase3 || '(none)'}`);

      if (vehNameCase3) {
        // Có vehicle_name → recommend từ GraphRag
        try {
          const recRes = await aiService.recommendByVehicle(vehNameCase3);
          recommend = recRes;
          frontSize = recRes.front_size || null;
          rearSize = recRes.rear_size || null;
        } catch (recErr) {
          logger.warn('Recommend by vehicle failed (CASE 3)', { error: recErr.message, tag: 'scan' });
        }
      } else {
        // Không có vehicle_name → tìm xe từ Neo4j
        try {
          const vehRes = await aiService.getVehiclesByPattern(pattern);
          vehicles = vehRes.vehicles || [];
        } catch (vehErr) {
          logger.warn('Get vehicles by pattern failed', { error: vehErr.message, tag: 'scan' });
          vehicles = [];
        }
      }

    } else {
      // ═══ Không có size, không có pattern ═══
      caseType = 'none';
      logger.warn('No size nor pattern detected');
    }

    return ApiResponse.success(res, {
      success: !!(size || pattern),
      merged,
      sides: detectResults,
      case_type: caseType,
      products,
      vehicles,
      recommend,
      front_size: frontSize,
      rear_size: rearSize,
    }, 'Scan hoàn tất');
  } catch (error) {
    logger.error('Scan failed', error, { tag: 'scan' });
    next(error);
  }
};
