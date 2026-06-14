-- =====================================================
-- Migration: Redesign products table (schema mới)
-- Chạy script này trong Supabase SQL Editor
-- =====================================================

-- 1. Thêm cột mới vào products
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS brand VARCHAR(100) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS size_type VARCHAR(10) DEFAULT 'METRIC',
      ADD COLUMN IF NOT EXISTS pattern VARCHAR(100),
        ADD COLUMN IF NOT EXISTS product_type VARCHAR(20),
          ADD COLUMN IF NOT EXISTS has_tube BOOLEAN,
            ADD COLUMN IF NOT EXISTS specs JSONB NOT NULL DEFAULT '{}';

            -- 2. Migrate dữ liệu cũ → cột mới
            --    (điều chỉnh logic theo dữ liệu thực tế của bạn)

            -- Gán product_type dựa trên category (nếu có)
            -- Lưu ý: sửa category_id cho phù hợp với DB thật của bạn
            UPDATE products
            SET product_type = 'motorcycle_tire'
            WHERE product_type IS NULL;

            -- Nếu có bảng brand riêng, map brand_id → brand name
            -- UPDATE products p SET brand = b.name FROM brand b WHERE p.brand_id = b.id;

            -- Chuyển dữ liệu từ old tire_type / ai_label nếu có
            -- UPDATE products SET product_type = CASE
            --   WHEN tire_type = 'motorcycle' OR category_id IN (...) THEN 'motorcycle_tire'
            --   WHEN tire_type = 'bicycle'   OR category_id IN (...) THEN 'bicycle_tire'
            --   ELSE 'motorcycle_tire'
            -- END
            -- WHERE product_type IS NULL;

            -- 3. Sau khi đã điền product_type xong, thêm NOT NULL constraint
            ALTER TABLE products
              ALTER COLUMN product_type SET NOT NULL,
                ADD CONSTRAINT products_product_type_check
                    CHECK (product_type IN ('motorcycle_tire','bicycle_tire','motorcycle_tube','bicycle_tube'));

                    -- 4. Xoá cột cũ (nếu có)
                    ALTER TABLE products
                      DROP COLUMN IF EXISTS rim_diameter,
                        DROP COLUMN IF EXISTS load_index,
                          DROP COLUMN IF EXISTS speed_rating,
                            DROP COLUMN IF EXISTS tire_type,
                              DROP COLUMN IF EXISTS ai_label;

                              -- 5. Thêm UNIQUE constraint (xoá cũ nếu trùng)
                              ALTER TABLE products DROP CONSTRAINT IF EXISTS products_brand_size_pattern_key;
                              ALTER TABLE products
                                ADD CONSTRAINT products_brand_size_pattern_key UNIQUE (brand, size, pattern);

                                -- 6. Xoá bảng payments (không dùng nữa)
                                DROP TABLE IF EXISTS payments;

                                -- =====================================================
                                -- Kiểm tra kết quả
                                -- =====================================================
                                SELECT column_name, data_type, is_nullable
                                FROM information_schema.columns
                                WHERE table_name = 'products'
                                ORDER BY ordinal_position;
                                