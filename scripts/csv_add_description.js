/**
 * Script thêm cột description vào seed CSV
 * Chạy: node scripts/csv_add_description.js
 * Kết quả: backup/seed_data_with_desc.csv
 */

const fs = require('fs');
const path = require('path');

const csvPath = path.resolve(__dirname, '../../backup/seed_data.csv');
const outPath = path.resolve(__dirname, '../../backup/seed_data_with_desc.csv');

const productLabels = {
  motorcycle_tire: 'Lốp xe máy',
  bicycle_tire: 'Lốp xe đạp',
  motorcycle_tube: 'Săm xe máy',
  bicycle_tube: 'Săm xe đạp',
};

function generateDescription(brand, size, productType, specs) {
  const label = productLabels[productType] || 'Lốp xe máy';
  const title = `${label} ${brand || ''} ${size || ''}`.trim();
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
  return `${title}\n${items.join(' | ')}`;
}

function escapeCsv(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// ── Main ──
const raw = fs.readFileSync(csvPath, 'utf-8').trim();
const lines = raw.split('\n');
const header = lines[0];

// Thêm cột description vào header
const newHeader = header + ',description';

const outLines = [newHeader];

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].replace(/\r$/, '');
  // CSV có 14 cột, cột cuối (specs) là JSON có thể chứa dấu phẩy
  // Tìm vị trí dấu phẩy thứ 13 từ đầu dòng — trước đó là 13 field đơn giản
  let commaIdx = -1;
  for (let c = 0; c < 13; c++) {
    commaIdx = line.indexOf(',', commaIdx + 1);
    if (commaIdx === -1) break;
  }
  if (commaIdx === -1) {
    console.error(`❌ Dòng ${i + 1} không parse được`);
    outLines.push(line + ',""');
    continue;
  }

  const first13 = line.slice(0, commaIdx);
  const specsRaw = line.slice(commaIdx + 1);

  const first13 = lines[i].slice(0, commaIdx);
  const specsRaw = lines[i].slice(commaIdx + 1);

  const fields = first13.split(',');
  const brand = fields[1];
  const size = fields[2];
  const productType = fields[5];

  // Parse specs JSON
  let specs = {};
  try {
    // JSON trong CSV dùng "" thay vì \", khôi phục + trim \r
    const jsonStr = specsRaw.replace(/""/g, '"').replace(/^"|"$/g, '').trim();
    specs = JSON.parse(jsonStr);
  } catch (e) {
    console.error(`❌ Dòng ${i + 1}: parse specs thất bại: ${e.message}`);
  }

  const desc = generateDescription(brand, size, productType, specs);
  const escapedDesc = escapeCsv(desc);
  outLines.push(lines[i] + ',' + escapedDesc);
}

fs.writeFileSync(outPath, outLines.join('\n'), 'utf-8');
console.log(`✅ Đã tạo: ${outPath}`);
console.log(`   Tổng: ${lines.length - 1} dòng (header + ${lines.length - 1} products)`);
