require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function testAdminQueries() {
  console.log('Testing Admin Queries...');

  // 1. Users Query
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select(`
      id, email, full_name, phone, role, is_active, created_at, note,
      orders(count)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(1);
    
  if (usersError) {
    console.error('Users Query Failed:', usersError.message, usersError.details);
  } else {
    console.log('Users Query OK', users.length);
  }

  // 2. Orders Query
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select(`
      id, order_number, total_amount, status, created_at,
      payment_status, is_paid, payment_proof_url,
      users!inner(full_name, email)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(1);

  if (ordersError) {
    console.error('Orders Query Failed:', ordersError.message, ordersError.details);
  } else {
    console.log('Orders Query OK', orders.length);
  }

  // 3. Products Query
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select(`
      id, sku, name, slug, price, sale_price, stock_quantity, is_active, created_at,
      categories(name),
      images:product_images(*)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(1);

  if (productsError) {
    console.error('Products Query Failed:', productsError.message, productsError.details);
  } else {
    console.log('Products Query OK', products.length);
  }
}

testAdminQueries();
