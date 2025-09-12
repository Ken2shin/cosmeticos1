-- Fix products table schema to match API expectations
-- Add category_id column and update existing data

-- First, ensure categories table exists with proper structure
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default categories if they don't exist
INSERT INTO categories (name, description) VALUES
('Labiales', 'Productos para labios'),
('Base de Maquillaje', 'Bases y correctores'),
('Sombras', 'Sombras para ojos'),
('Máscaras', 'Máscaras de pestañas'),
('Rubor', 'Rubores y coloretes'),
('Cejas', 'Productos para cejas'),
('Skincare', 'Cuidado de la piel')
ON CONFLICT (name) DO NOTHING;

-- Add category_id column if it doesn't exist
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id INTEGER;

-- Update existing products to use category_id instead of category string
UPDATE products SET category_id = (
  CASE 
    WHEN category = 'Labiales' THEN (SELECT id FROM categories WHERE name = 'Labiales')
    WHEN category = 'Base' THEN (SELECT id FROM categories WHERE name = 'Base de Maquillaje')
    WHEN category = 'Ojos' THEN (SELECT id FROM categories WHERE name = 'Sombras')
    WHEN category = 'Mejillas' THEN (SELECT id FROM categories WHERE name = 'Rubor')
    WHEN category = 'Cejas' THEN (SELECT id FROM categories WHERE name = 'Cejas')
    WHEN category = 'Herramientas' THEN (SELECT id FROM categories WHERE name = 'Skincare')
    ELSE (SELECT id FROM categories WHERE name = 'Labiales')
  END
) WHERE category_id IS NULL;

-- Add foreign key constraint
ALTER TABLE products ADD CONSTRAINT fk_products_category 
FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;

-- Ensure currency_code column exists with default
ALTER TABLE products ADD COLUMN IF NOT EXISTS currency_code VARCHAR(3) DEFAULT 'USD';

-- Create currencies table if it doesn't exist
CREATE TABLE IF NOT EXISTS currencies (
  id SERIAL PRIMARY KEY,
  code VARCHAR(3) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  symbol VARCHAR(10) NOT NULL,
  flag_emoji VARCHAR(10) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default currencies
INSERT INTO currencies (code, name, symbol, flag_emoji) VALUES
('USD', 'Dólar Estadounidense', '$', '🇺🇸'),
('NIO', 'Córdoba Nicaragüense', 'C$', '🇳🇮')
ON CONFLICT (code) DO NOTHING;

-- Add foreign key for currency if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_products_currency'
    ) THEN
        ALTER TABLE products ADD CONSTRAINT fk_products_currency 
        FOREIGN KEY (currency_code) REFERENCES currencies(code);
    END IF;
END $$;

-- Ensure all products have valid currency_code
UPDATE products SET currency_code = 'USD' WHERE currency_code IS NULL;
