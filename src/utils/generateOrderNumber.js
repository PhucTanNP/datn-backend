/**
 * Generate order number: DRC-2024-00001
 */
const supabase = require('../config/database');

const generateOrderNumber = async () => {
  const year = new Date().getFullYear();
  const { data: lastOrder, error } = await supabase
    .from('orders')
    .select('order_number')
    .like('order_number', `DRC-${year}-%`)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  let nextNum = 1;
  if (lastOrder) {
    const parts = lastOrder.order_number.split('-');
    nextNum = parseInt(parts[2]) + 1;
  }

  return `DRC-${year}-${String(nextNum).padStart(5, '0')}`;
};

module.exports = generateOrderNumber;
