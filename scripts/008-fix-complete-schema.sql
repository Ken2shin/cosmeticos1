-- Fix all database schema issues to match API expectations

-- First, ensure currencies table exists
CREATE TABLE IF NOT EXISTS currencies (
    id SERIAL PRIMARY KEY,
    code VARCHAR(3) UNIQUE NOT NULL,
    name VARCHAR(50) NOT NULL,
    symbol VARCHAR(5) NOT NULL,
    flag_emoji VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default currencies if they don't exist
INSERT INTO currencies (code, name, symbol, flag_emoji) 
VALUES 
    ('USD', 'US Dollar', '$', '🇺🇸'),
    ('EUR', 'Euro', '€', '🇪🇺'),
    ('GBP', 'British Pound', '£', '🇬🇧'),
    ('CAD', 'Canadian Dollar', 'C$', '🇨🇦')
ON CONFLICT (code) DO NOTHING;

-- Ensure categories table exists with proper structure
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default categories if they don't exist
INSERT INTO categories (name, description) 
VALUES 
    ('Labiales', 'Productos para labios'),
    ('Base', 'Bases y correctores'),
    ('Ojos', 'Productos para ojos'),
    ('Rostro', 'Productos para el rostro'),
    ('Cuidado', 'Productos de cuidado personal')
ON CONFLICT (name) DO NOTHING;

-- Fix products table schema
-- Add new columns if they don't exist
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES categories(id),
ADD COLUMN IF NOT EXISTS currency_code VARCHAR(3) DEFAULT 'USD' REFERENCES currencies(code);

-- Migrate existing category data to category_id
UPDATE products 
SET category_id = (
    SELECT id FROM categories 
    WHERE LOWER(categories.name) = LOWER(products.category)
    LIMIT 1
)
WHERE category_id IS NULL AND category IS NOT NULL;

-- Set default category for products without category
UPDATE products 
SET category_id = (SELECT id FROM categories WHERE name = 'Rostro' LIMIT 1)
WHERE category_id IS NULL;

-- Fix notifications table - add missing user_type column
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS user_type VARCHAR(20) DEFAULT 'customer';

-- Update existing notifications
UPDATE notifications 
SET user_type = 'customer' 
WHERE user_type IS NULL;

-- Ensure all required columns exist in products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Create trigger to update updated_at automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Verify the schema is correct
SELECT 'Schema fix completed successfully' as status;
