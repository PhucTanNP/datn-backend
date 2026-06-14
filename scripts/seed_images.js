/**
 * Seed ảnh sản phẩm theo pattern
 * - Cùng pattern → dùng chung 1 ảnh cho tất cả sản phẩm
 *
 * Cách chạy:
 *   cd backend
 *   node scripts/seed_images.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const supabase = require('../src/config/database');
const cloudinary = require('../src/config/cloudinary');

// ── Trích pattern từ tên file ──
function extractPattern(filename) {
  const dMatch = filename.match(/[D]\d{3}/);
  if (dMatch) return dMatch[0];
  const numMatch = filename.match(/(\d{3})/);
  if (numMatch) return numMatch[1];
  return null;
}

async function main() {
  console.log('🚀 Seed ảnh theo pattern...\n');

  // ── 1. Lấy tất cả products ──
  const { data: products, error } = await supabase
    .from('products')
    .select('id, brand, size, pattern, name, has_tube');

  if (error) { console.error('❌', error.message); return; }
  console.log(`📦 ${products.length} sản phẩm trong DB\n`);

  // ── 2. Index products theo pattern ──
  const byPattern = {};
  for (const p of products) {
    if (!p.pattern) continue;
    const key = p.pattern.toLowerCase();
    if (!byPattern[key]) byPattern[key] = [];
    byPattern[key].push(p);
  }

  // ── 3. Gom ảnh theo pattern ──
  const imageDir = path.join(__dirname, '..', 'images');
  const tasks = [];

  // XE_MAY_DRC — các pattern 3 số (301, 311...)
  const drcDir = path.join(imageDir, 'XE_MAY_DRC');
  if (fs.existsSync(drcDir)) {
    for (const f of fs.readdirSync(drcDir)) {
      if (!/\.(jpg|jpeg|png|webp)$/i.test(f)) continue;
      const pat = extractPattern(f);
      if (pat) tasks.push({ file: path.join(drcDir, f), pattern: pat });
    }
  }

  // XE_MAY_DPLUS_KOSAM — DPLUS không săm (118, 119, D352...)
  const dplusDir = path.join(imageDir, 'XE_MAY_DPLUS_KOSAM');
  if (fs.existsSync(dplusDir)) {
    for (const f of fs.readdirSync(dplusDir)) {
      if (!/\.(jpg|jpeg|png|webp)$/i.test(f)) continue;
      const pat = extractPattern(f);
      if (pat) tasks.push({ file: path.join(dplusDir, f), pattern: pat });
    }
  }

  // example — 367 có săm, D373 có săm, xe đạp
  const exDir = path.join(imageDir, 'example');
  if (fs.existsSync(exDir)) {
    for (const f of fs.readdirSync(exDir)) {
      if (!/\.(jpg|jpeg|png|webp)$/i.test(f)) continue;
      const pat = extractPattern(f);
      if (pat) tasks.push({ file: path.join(exDir, f), pattern: pat });
    }
  }

  console.log(`🖼️  Tìm thấy ${tasks.length} ảnh\n`);

  let uploaded = 0, skipped = 0, failed = 0;
  const donePatterns = new Set();

  for (const task of tasks) {
    const patternLC = task.pattern.toLowerCase();
    const candidates = byPattern[patternLC] || [];

    if (candidates.length === 0) {
      console.log(`   ⏭️  ${path.basename(task.file)} → pattern ${task.pattern} không có product`);
      skipped++;
      continue;
    }

    // Bỏ qua nếu pattern này đã xử lý rồi (tránh trùng)
    if (donePatterns.has(patternLC)) {
      console.log(`   ⏭️  ${path.basename(task.file)} → pattern ${task.pattern} đã có ảnh`);
      skipped++;
      continue;
    }
    donePatterns.add(patternLC);

    // Upload 1 ảnh lên Cloudinary
    let result;
    try {
      result = await cloudinary.uploader.upload(task.file, {
        folder: 'products',
        public_id: `pattern_${patternLC}`,
      });
    } catch (err) {
      console.log(`   ❌ ${path.basename(task.file)} → upload lỗi: ${err.message}`);
      failed++;
      continue;
    }

    // Gán ảnh cho TẤT CẢ sản phẩm cùng pattern
    let inserted = 0;
    for (const product of candidates) {
      const { error: insErr } = await supabase
        .from('product_images')
        .insert({
          product_id: product.id,
          cloudinary_id: result.public_id,
          url: result.secure_url,
          alt_text: product.name || product.pattern,
          is_primary: true,
          sort_order: 0,
        });

      if (insErr) {
        if (insErr.code === '23505') continue; // đã có ảnh rồi
        console.log(`      ❌ DB lỗi: ${insErr.message}`);
        failed++;
      } else {
        inserted++;
      }
    }

    console.log(`   ✅ ${path.basename(task.file)} → pattern ${task.pattern} → ${inserted} sản phẩm`);
    uploaded++;
  }

  // ── 4. Đồng bộ image_url vào products ──
  console.log('\n🔄 Đồng bộ image_url...');
  const { data: primaries } = await supabase
    .from('product_images')
    .select('product_id, url')
    .eq('is_primary', true);

  if (primaries) {
    for (const img of primaries) {
      await supabase.from('products').update({ image_url: img.url }).eq('id', img.product_id);
    }
    console.log(`   ✅ Đã cập nhật image_url cho ${primaries.length} sản phẩm`);
  }

  console.log(`\n📊 KẾT QUẢ:`);
  console.log(`   ✅ Upload + gán: ${uploaded} pattern`);
  console.log(`   ⏭️  Bỏ qua: ${skipped}`);
  console.log(`   ❌ Thất bại: ${failed}`);

  // In pattern chưa có ảnh
  const allPatterns = [...new Set(products.filter(p => p.pattern).map(p => p.pattern.toLowerCase()))];
  const missing = allPatterns.filter(p => !donePatterns.has(p)).sort();
  if (missing.length > 0) {
    console.log(`\n📋 Pattern chưa có ảnh (${missing.length}):`);
    console.log(`   ${missing.join(', ')}`);
  }
}

main().catch(console.error);
