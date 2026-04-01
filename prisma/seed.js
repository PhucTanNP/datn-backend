const prisma = require('../src/config/database');
const bcrypt = require('bcryptjs');

async function seed() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@drc-tires.vn' },
    update: {},
    create: {
      email: 'admin@drc-tires.vn',
      passwordHash: adminPassword,
      fullName: 'Admin DRC',
      phone: '0236383184',
      role: 'admin',
      isActive: true,
    },
  });
  console.log('✅ Admin user created:', admin.email);

  // Create test customer
  const customerPassword = await bcrypt.hash('customer123', 12);
  const customer = await prisma.user.upsert({
    where: { email: 'customer@test.com' },
    update: {},
    create: {
      email: 'customer@test.com',
      passwordHash: customerPassword,
      fullName: 'Nguyễn Văn Test',
      phone: '0901234567',
      role: 'customer',
      isActive: true,
    },
  });
  console.log('✅ Customer user created:', customer.email);

  // Create categories
  const categories = [
    { name: 'Lốp xe máy', slug: 'lop-xe-may', description: 'Lốp xe máy DRC chất lượng cao' },
    { name: 'Lốp ô tô', slug: 'lop-o-to', description: 'Lốp ô tô con, sedan, hatchback' },
    { name: 'Lốp SUV', slug: 'lop-suv', description: 'Lốp xe SUV, crossover' },
    { name: 'Lốp xe tải', slug: 'lop-xe-tai', description: 'Lốp xe tải nhẹ và xe tải nặng' },
    { name: 'Lốp xe đạp', slug: 'lop-xe-dap', description: 'Lốp và săm xe đạp' },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }
  console.log('✅ Categories created:', categories.length);

  // Create sample products
  const motorcycleCategory = await prisma.category.findUnique({ where: { slug: 'lop-xe-may' } });

  const products = [
    {
      sku: 'DRC-MC-8090-14',
      name: 'Lốp DRC 80/90-14 DRC D352',
      slug: 'lop-drc-80-90-14-d352',
      description: 'Lốp xe máy DRC 80/90-14, hoa lốp D352, phù hợp xe tay ga Honda Vision, Janus.',
      price: 265000,
      salePrice: 245000,
      stockQuantity: 150,
      size: '80/90-14',
      rimDiameter: 14,
      loadIndex: '40P',
      speedRating: 'P',
      tireType: 'motorcycle',
      categoryId: motorcycleCategory?.id,
    },
    {
      sku: 'DRC-MC-7090-17',
      name: 'Lốp DRC 70/90-17 DRC D340',
      slug: 'lop-drc-70-90-17-d340',
      description: 'Lốp xe máy DRC 70/90-17, hoa lốp D340, phù hợp xe số Honda Wave, Future.',
      price: 195000,
      stockQuantity: 200,
      size: '70/90-17',
      rimDiameter: 17,
      loadIndex: '38P',
      speedRating: 'P',
      tireType: 'motorcycle',
      categoryId: motorcycleCategory?.id,
    },
    {
      sku: 'DRC-MC-8090-17',
      name: 'Lốp DRC 80/90-17 DRC D354',
      slug: 'lop-drc-80-90-17-d354',
      description: 'Lốp xe máy DRC 80/90-17, hoa lốp D354, phù hợp xe Exciter, Winner.',
      price: 225000,
      salePrice: 210000,
      stockQuantity: 180,
      size: '80/90-17',
      rimDiameter: 17,
      loadIndex: '44P',
      speedRating: 'P',
      tireType: 'motorcycle',
      categoryId: motorcycleCategory?.id,
    },
    {
      sku: 'DRC-MC-11070-17',
      name: 'Lốp DRC 110/70-17 DRC D355',
      slug: 'lop-drc-110-70-17-d355',
      description: 'Lốp xe máy DRC 110/70-17, hoa lốp D355, phù hợp xe mô tô phân khối lớn.',
      price: 385000,
      stockQuantity: 100,
      size: '110/70-17',
      rimDiameter: 17,
      loadIndex: '54P',
      speedRating: 'P',
      tireType: 'motorcycle',
      categoryId: motorcycleCategory?.id,
    },
    {
      sku: 'DRC-MC-9090-14',
      name: 'Lốp DRC 90/90-14 DRC D373',
      slug: 'lop-drc-90-90-14-d373',
      description: 'Lốp xe máy DRC 90/90-14, hoa lốp D373, phù hợp xe tay ga SH, PCX.',
      price: 310000,
      salePrice: 289000,
      stockQuantity: 120,
      size: '90/90-14',
      rimDiameter: 14,
      loadIndex: '46P',
      speedRating: 'P',
      tireType: 'motorcycle',
      categoryId: motorcycleCategory?.id,
    },
    {
      sku: 'DRC-MC-3000-18',
      name: 'Lốp DRC 3.00-18 DRC D327',
      slug: 'lop-drc-300-18-d327',
      description: 'Lốp xe máy DRC 3.00-18, hoa lốp D327, phù hợp xe Win, CG125.',
      price: 180000,
      stockQuantity: 250,
      size: '3.00-18',
      rimDiameter: 18,
      loadIndex: '47P',
      speedRating: 'P',
      tireType: 'motorcycle',
      categoryId: motorcycleCategory?.id,
    },
  ];

  for (const prod of products) {
    await prisma.product.upsert({
      where: { sku: prod.sku },
      update: {},
      create: prod,
    });
  }
  console.log('✅ Products created:', products.length);

  console.log('🎉 Seed completed!');
}

seed()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
