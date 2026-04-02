require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Khởi tạo Supabase client (cho DB hoặc storage)
const supabaseUrl = process.env.SUPABASE_URL || 'your-supabase-url';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'your-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testSupabaseConnection() {
  try {
    console.log('🔍 Testing Supabase connection...');

    // Test DB connection: Query một bảng đơn giản (giả sử có bảng users)
    const { data, error } = await supabase
      .from('users')  // Thay bằng bảng thực nếu có
      .select('count', { count: 'exact', head: true });

    if (error) {
      throw error;
    }

    console.log('✅ Supabase DB connection successful!');
    console.log('   - User count (approx):', data || 'N/A');

    // Test Storage (nếu dùng)
    const { data: buckets, error: storageError } = await supabase.storage.listBuckets();

    if (storageError) {
      console.log('⚠️  Storage test skipped (no access or not configured)');
    } else {
      console.log('✅ Supabase Storage connection successful!');
      console.log('   - Buckets:', buckets.map(b => b.name).join(', ') || 'None');
    }

  } catch (error) {
    console.error('❌ Supabase connection failed:');
    console.error('   Error:', error.message);
    if (error.code) {
      console.error('   Code:', error.code);
    }
  }
}

// Run the test
testSupabaseConnection();