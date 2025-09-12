-- Fix customer persistence and add real-time profit tracking

-- Ensure customers table has proper constraints
ALTER TABLE customers 
ADD CONSTRAINT unique_customer_email UNIQUE (email);

-- Create or update profit tracking table
CREATE TABLE IF NOT EXISTS profit_tracking (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id),
  product_id INTEGER REFERENCES products(id),
  quantity INTEGER NOT NULL,
  sale_price DECIMAL(10,2) NOT NULL,
  cost_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  profit DECIMAL(10,2) GENERATED ALWAYS AS (sale_price - cost_price) STORED,
  profit_margin DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE 
      WHEN sale_price > 0 THEN ((sale_price - cost_price) / sale_price * 100)
      ELSE 0 
    END
  ) STORED,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add cost_price to products if it doesn't exist
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10,2) DEFAULT 0;

-- Function to calculate real-time profits
CREATE OR REPLACE FUNCTION calculate_order_profit()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert profit tracking record
  INSERT INTO profit_tracking (order_id, product_id, quantity, sale_price, cost_price)
  SELECT 
    NEW.order_id,
    NEW.product_id,
    NEW.quantity,
    NEW.unit_price,
    COALESCE(p.cost_price, 0)
  FROM products p 
  WHERE p.id = NEW.product_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic profit calculation
DROP TRIGGER IF EXISTS trigger_calculate_profit ON order_items;
CREATE TRIGGER trigger_calculate_profit
  AFTER INSERT ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION calculate_order_profit();

-- Update existing products with default cost prices (50% of sale price as example)
UPDATE products 
SET cost_price = price * 0.5 
WHERE cost_price = 0 OR cost_price IS NULL;

-- Create view for real-time profit reports
CREATE OR REPLACE VIEW profit_summary AS
SELECT 
  DATE_TRUNC('day', pt.created_at) as date,
  COUNT(DISTINCT pt.order_id) as total_orders,
  SUM(pt.sale_price * pt.quantity) as total_revenue,
  SUM(pt.cost_price * pt.quantity) as total_costs,
  SUM(pt.profit * pt.quantity) as total_profit,
  AVG(pt.profit_margin) as avg_profit_margin
FROM profit_tracking pt
GROUP BY DATE_TRUNC('day', pt.created_at)
ORDER BY date DESC;

-- Ensure all customers are preserved
CREATE OR REPLACE FUNCTION preserve_customer_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent deletion of customer records
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Customer records cannot be deleted for data integrity';
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent customer deletion
DROP TRIGGER IF EXISTS prevent_customer_deletion ON customers;
CREATE TRIGGER prevent_customer_deletion
  BEFORE DELETE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION preserve_customer_data();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_profit_tracking_order_id ON profit_tracking(order_id);
CREATE INDEX IF NOT EXISTS idx_profit_tracking_created_at ON profit_tracking(created_at);

-- Insert sample cost prices for existing products if needed
INSERT INTO products (name, price, cost_price, category, is_active) 
VALUES 
  ('Producto Demo', 100.00, 60.00, 'Demo', true)
ON CONFLICT DO NOTHING;

COMMIT;
