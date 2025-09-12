-- Ensure products table has all required columns for client API
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Ensure categories table exists for client API
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default categories
INSERT INTO categories (name, description) 
VALUES 
  ('Labiales', 'Productos para labios'),
  ('Base', 'Bases y correctores'),
  ('Ojos', 'Productos para ojos'),
  ('Cuidado', 'Productos de cuidado facial')
ON CONFLICT (name) DO NOTHING;

-- Update existing products to be active by default
UPDATE products SET is_active = true WHERE is_active IS NULL;
