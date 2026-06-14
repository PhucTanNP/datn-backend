/**
 * Script tự động sinh description từ specs cho các sản phẩm đã có
 *
 * Cách chạy:
 *   node scripts/generate_descriptions.js
 *
 * Mô tả được sinh theo format:
 *   {label} {brand} {size}
 *   Nhóm: ... | Cấu trúc: ... | Đường kính vành: ... | ...
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// ── Config ──
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Thiếu SUPABASE_URL hoặc SUPABASE_KEY trong .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ── Label mapping ──
const productLabels = {
  motorcycle_tire: 'Lốp xe máy',
  bicycle_tire: 'Lốp xe đạp',
  motorcycle_tube: 'Săm xe máy',
  bicycle_tube: 'Săm xe đạp',
};

/**
 * Sinh mô tả từ specs (giống logic frontend)
 */
function generateDescription(product) {
  const label = productLabels[product.product_type] || 'Lốp xe máy';
  const title = `${label} ${product.brand || ''} ${product.size || ''}`.trim();

  const specs = product.specs || {};
  const items = [];

  if (specs.nhom_lop) items.push(`Nhóm: ${specs.nhom_lop}`);
  if (specs.dong_series) items.push(`Series: ${specs.dong_series}`);
  if (specs.cau_truc_lop) items.push(`Cấu trúc: ${specs.cau_truc_lop}`);
  if (specs.duong_kinh_vanh) items.push(`Đường kính vành: ${specs.duong_kinh_vanh}"`);
  if (specs.rong_vanh_tieu_chuan) items.push(`Rộng vành TC: ${specs.rong_vanh_tieu_chuan}"`);
  if (specs.rong_vanh_thich_hop) items.push(`Rộng vành TH: ${specs.rong_vanh_thich_hop}"`);
  if (specs.duong_kinh_ngoai) items.push(`Đường kính ngoài: ${specs.duong_kinh_ngoai} mm`);
  if (specs.chieu_rong_toan_bo) items.push(`Chiều rộng toàn bộ: ${specs.chieu_rong_toan_bo} mm`);
  if (specs.chieu_sau_hoa) items.push(`Chiều sâu hoa: ${specs.chieu_sau_hoa} mm`);
  if (specs.phan_loai_tai) items.push(`Phân loại tải: ${specs.phan_loai_tai}`);
  if (specs.chi_so_tai_toc_do) items.push(`Tải tốc độ: ${specs.chi_so_tai_toc_do}`);
  if (specs.tai_trong_lon_nhat) items.push(`Tải trọng tối đa: ${specs.tai_trong_lon_nhat} kg`);
  if (specs.noi_ap_tieu_chuan) items.push(`Nội áp: ${specs.noi_ap_tieu_chuan} kPa`);
  if (specs.toc_do_toi_da) items.push(`Tốc độ tối đa: ${specs.toc_do_toi_da} km/h`);
  if (specs.so_lop_bo) items.push(`Số lớp: ${specs.so_lop_bo}`);
  if (specs.van) items.push(`Van: ${specs.van}`);
  if (specs.trong_luong) items.push(`Trọng lượng: ${specs.trong_luong} g`);

  if (items.length === 0) return title;
  return title + '\n' + items.join(' | ');
}

async function main() {
  console.log('🔄 Đang đọc sản phẩm từ DB...\n');

  // Lấy tất cả sản phẩm có specs nhưng chưa có description (hoặc description rỗng)
  const { data: products, error } = await supabase
    .from('products')
    .select('id, brand, size, product_type, specs, description')
    .not('specs', 'is', null);

  if (error) {
    console.error('❌ Lỗi đọc sản phẩm:', error.message);
    process.exit(1);
  }

  console.log(`📦 Tìm thấy ${products.length} sản phẩm có specs\n`);

  let updated = 0;
  let skipped = 0;

  for (const product of products) {
    const specs = product.specs;
    const hasSpecs = specs && typeof specs === 'object' && Object.keys(specs).length > 0;

    if (!hasSpecs) {
      console.log(`   ⏭️  ${product.id.slice(0, 8)}... — specs rỗng, bỏ qua`);
      skipped++;
      continue;
    }

    const newDesc = generateDescription(product);

    // Chỉ update nếu description khác
    if (product.description === newDesc) {
      console.log(`   ⏭️  ${product.id.slice(0, 8)}... — đã có description, bỏ qua`);
      skipped++;
      continue;
    }

    const { error: updateError } = await supabase
      .from('products')
      .update({ description: newDesc })
      .eq('id', product.id);

    if (updateError) {
      console.error(`   ❌ ${product.id.slice(0, 8)}... — lỗi: ${updateError.message}`);
    } else {
      console.log(`   ✅ ${product.id.slice(0, 8)}... — đã cập nhật description`);
      updated++;
    }
  }

  console.log(`\n📊 KẾT QUẢ:`);
  console.log(`   ✅ Đã cập nhật: ${updated} sản phẩm`);
  console.log(`   ⏭️  Bỏ qua: ${skipped} sản phẩm`);
  console.log(`   📦 Tổng: ${products.length} sản phẩm`);
}

main().catch(console.error);
