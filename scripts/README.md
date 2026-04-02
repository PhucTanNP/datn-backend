# Scripts Folder

Thư mục chứa các script để quản lý upload và import dữ liệu.

## Scripts Available

### upload_product_images.js
- **Mục đích**: Upload bulk ảnh sản phẩm lên Cloudinary và lưu vào DB.
- **Cách dùng**:
  1. Đặt ảnh vào folder `images/` (tên file = sku.jpg, ví dụ: `3.00-18-d354-0.jpg`).
  2. Chạy: `node scripts/upload_product_images.js`
- **Yêu cầu**: Products đã import vào DB, Cloudinary keys trong .env.

### test_cloudinary.js (root)
- Test kết nối Cloudinary.
- Chạy: `node test_cloudinary.js`

### test_supabase.js (root)
- Test kết nối Supabase.
- Chạy: `node test_supabase.js`

## Lưu ý
- Đảm bảo .env có đầy đủ keys trước khi chạy.
- Scripts dùng Prisma và Cloudinary, cần cài dependencies.