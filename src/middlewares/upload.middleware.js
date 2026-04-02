const multer = require('multer');

const cloudinary = require('../config/cloudinary');

const getCloudinaryStorage = (folder, transformation = []) => ({
  _handleFile: (req, file, cb) => {
    const params = {
      folder,
      resource_type: 'image',
      transformation,
    };
    const uploadStream = cloudinary.uploader.upload_stream(params, (error, result) => {
      if (error) {
        return cb(error);
      }
      cb(null, {
        fieldname: file.fieldname,
        originalname: file.originalname,
        encoding: file.encoding,
        mimetype: file.mimetype,
        size: result.bytes,
        filename: result.public_id,
        path: result.secure_url,
        cloudinaryId: result.public_id,
      });
    });
    file.stream.pipe(uploadStream);
  },
  _removeFile: (req, file, cb) => cb(null),
});

const productStorage = getCloudinaryStorage('drc-tires/products', [{ width: 800, height: 800, crop: 'limit', quality: 'auto' }]);
const inspectionStorage = getCloudinaryStorage('drc-tires/inspections');
const avatarStorage = getCloudinaryStorage('drc-tires/avatars', [{ width: 200, height: 200, crop: 'fill', gravity: 'face', quality: 'auto' }]);

const productFileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPG, PNG, WebP allowed'), false);
  }
};

const inspectionFileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPG, PNG allowed'), false);
  }
};

const avatarFileFilter = productFileFilter;  // same as product

exports.uploadProduct = multer({ 
  storage: productStorage, 
  fileFilter: productFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } 
});
exports.uploadInspection = multer({ 
  storage: inspectionStorage, 
  fileFilter: inspectionFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } 
});
exports.uploadAvatar = multer({ 
  storage: avatarStorage, 
  fileFilter: avatarFileFilter,
  limits: { fileSize: 2 * 1024 * 1024 } 
});
