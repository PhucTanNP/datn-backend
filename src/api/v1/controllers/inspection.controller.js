const aiService = require('../../../services/ai.service');
const prisma = require('../../../config/database');
const ApiResponse = require('../../../utils/response');

exports.inspect = async (req, res, next) => {
  try {
    if (!req.file) {
      return ApiResponse.error(res, 'Image is required', 400);
    }

    const imageUrl = req.file.path;
    const cloudinaryId = req.file.filename;

    // Call AI service
    const aiResult = await aiService.inspectTire(imageUrl);

    // Save inspection result
    const inspection = await prisma.tireInspection.create({
      data: {
        userId: req.user.id,
        imageCloudinaryId: cloudinaryId,
        imageUrl: imageUrl,
        wearLevel: aiResult.wear_level,
        wearPercentage: aiResult.wear_percentage,
        tireTypeDetected: aiResult.tire_type,
        crackDetected: aiResult.crack_detected || false,
        crackSeverity: aiResult.crack_severity || 'none',
        crackLocations: aiResult.crack_locations || [],
        aiConfidence: aiResult.confidence,
        aiRawResult: aiResult,
        recommendation: aiResult.recommendation,
        suggestedProducts: aiResult.suggested_product_ids || [],
      },
    });

    return ApiResponse.success(res, inspection, 'Inspection completed');
  } catch (error) {
    next(error);
  }
};

exports.getHistory = async (req, res, next) => {
  try {
    const inspections = await prisma.tireInspection.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return ApiResponse.success(res, inspections);
  } catch (error) {
    next(error);
  }
};
