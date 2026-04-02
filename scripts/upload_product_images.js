require('dotenv').config();
const fs = require('fs');
const path = require('path');
const cloudinary = require('../src/config/cloudinary');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function uploadProductImages() {
  try {
    console.log('🚀 Starting bulk upload of product images...');

    // Đọc products từ DB để lấy ID
    const products = await prisma.product.findMany({
      select: { id: true, sku: true, name: true },
    });

    const skuToId = Object.fromEntries(products.map(p => [p.sku, p.id]));

    // Folder chứa ảnh (giả sử images/ với tên file = sku.jpg)
    const imageFolder = path.join(__dirname, '..', 'images');

    if (!fs.existsSync(imageFolder)) {
      console.log('⚠️  Image folder not found. Skipping upload.');
      return;
    }

    let uploadedCount = 0;

    for (const product of products) {
      const imagePath = path.join(imageFolder, `${product.sku}.jpg`);

      if (fs.existsSync(imagePath)) {
        try {
          // Upload lên Cloudinary
          const result = await cloudinary.uploader.upload(imagePath, {
            folder: 'products',
            public_id: product.sku,
          });

          // Lưu vào DB
          await prisma.productImage.create({
            data: {
              productId: product.id,
              cloudinaryId: result.public_id,
              url: result.secure_url,
              altText: product.name,
              isPrimary: true,
              sortOrder: 1,
            },
          });

          console.log(`✅ Uploaded: ${product.sku}`);
          uploadedCount++;
        } catch (uploadError) {
          console.error(`❌ Failed to upload ${product.sku}:`, uploadError.message);
        }
      } else {
        console.log(`⚠️  Image not found: ${imagePath}`);
      }
    }

    console.log(`🎉 Upload complete! Uploaded ${uploadedCount} images.`);

  } catch (error) {
    console.error('❌ Bulk upload failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
uploadProductImages();