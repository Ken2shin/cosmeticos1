-- Create inventory table for tracking purchase costs and stock management
CREATE TABLE IF NOT EXISTS inventory (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  purchase_price DECIMAL(10,2) NOT NULL,
  purchase_quantity INTEGER NOT NULL,
  purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  supplier_name VARCHAR(255),
  supplier_contact VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_inventory_product_id ON inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_purchase_date ON inventory(purchase_date);

-- Add cost tracking columns to products table if they don't exist
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS profit_margin DECIMAL(5,2) DEFAULT 0.00;
