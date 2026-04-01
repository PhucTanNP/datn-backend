const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

const productStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'drc-tires/products',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 800, height: 800, crop: 'limit', quality: 'auto' }],
  },
});

const inspectionStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'drc-tires/inspections',
    allowed_formats: ['jpg', 'jpeg', 'png'],
  },
});

const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'drc-tires/avatars',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 200, height: 200, crop: 'fill', gravity: 'face', quality: 'auto' }],
  },
});

exports.uploadProduct    = multer({ storage: productStorage, limits: { fileSize: 5 * 1024 * 1024 } });
exports.uploadInspection = multer({ storage: inspectionStorage, limits: { fileSize: 10 * 1024 * 1024 } });
exports.uploadAvatar     = multer({ storage: avatarStorage, limits: { fileSize: 2 * 1024 * 1024 } });
