require('dotenv').config();
const cloudinary = require('./src/config/cloudinary');

async function testCloudinaryConnection() {
  try {
    console.log('🔍 Testing Cloudinary connection...');

    // Test upload a small image (base64 encoded pixel)
    const testImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='; // 1x1 transparent PNG

    const result = await cloudinary.uploader.upload(testImage, {
      folder: 'test-connection',
      public_id: 'test-image',
    });

    console.log('✅ Cloudinary connection successful!');
    console.log('📸 Uploaded test image:');
    console.log('   - Public ID:', result.public_id);
    console.log('   - URL:', result.secure_url);
    console.log('   - Cloud Name:', result.cloud_name);

    // Optional: Delete the test image
    await cloudinary.uploader.destroy(result.public_id);
    console.log('🗑️  Test image deleted.');

  } catch (error) {
    console.error('❌ Cloudinary connection failed:');
    console.error('   Error:', error.message);
    if (error.http_code) {
      console.error('   HTTP Code:', error.http_code);
    }
  }
}

// Run the test
testCloudinaryConnection();