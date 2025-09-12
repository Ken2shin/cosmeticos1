-- Create push_subscriptions table if it doesn't exist
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id SERIAL PRIMARY KEY,
    user_type VARCHAR(50) NOT NULL DEFAULT 'admin',
    endpoint TEXT NOT NULL,
    p256dh TEXT,
    auth TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create currencies table if it doesn't exist
CREATE TABLE IF NOT EXISTS currencies (
    id SERIAL PRIMARY KEY,
    code VARCHAR(3) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    symbol VARCHAR(10) NOT NULL,
    flag_emoji VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default currencies
INSERT INTO currencies (code, name, symbol, flag_emoji) VALUES
('USD', 'US Dollar', '$', '🇺🇸'),
('EUR', 'Euro', '€', '🇪🇺'),
('HNL', 'Honduran Lempira', 'L', '🇭🇳')
ON CONFLICT (code) DO NOTHING;

-- Create categories table if it doesn't exist
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default categories
INSERT INTO categories (name, description) VALUES
('Labiales', 'Productos para labios'),
('Base', 'Bases de maquillaje'),
('Ojos', 'Productos para ojos'),
('Cuidado', 'Productos de cuidado facial')
ON CONFLICT (name) DO NOTHING;

-- Update products table to ensure it has all required columns
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS currency_code VARCHAR(3) DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS category_id INTEGER,
ADD COLUMN IF NOT EXISTS brand VARCHAR(100),
ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add foreign key constraints if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'products_currency_code_fkey'
    ) THEN
        ALTER TABLE products ADD CONSTRAINT products_currency_code_fkey 
        FOREIGN KEY (currency_code) REFERENCES currencies(code);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'products_category_id_fkey'
    ) THEN
        ALTER TABLE products ADD CONSTRAINT products_category_id_fkey 
        FOREIGN KEY (category_id) REFERENCES categories(id);
    END IF;
END $$;

-- Update existing products to have valid category_id and currency_code
UPDATE products 
SET category_id = (SELECT id FROM categories WHERE name = 'Labiales' LIMIT 1),
    currency_code = 'USD'
WHERE category_id IS NULL OR currency_code IS NULL;
