const cloudinary = require('../config/cloudinary');

class CloudinaryService {
  async deleteImage(publicId) {
    return await cloudinary.uploader.destroy(publicId);
  }

  getOptimizedUrl(publicId, options = {}) {
    return cloudinary.url(publicId, {
      fetch_format: 'auto',
      quality: 'auto',
      ...options,
    });
  }

  async uploadFromBuffer(buffer, folder = 'drc-tires/products') {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'image' },
        (error, result) => {
          if (error) reject(error);
          else resolve({
            cloudinaryId: result.public_id,
            url: result.secure_url,
          });
        }
      );
      stream.end(buffer);
    });
  }
}

module.exports = new CloudinaryService();
