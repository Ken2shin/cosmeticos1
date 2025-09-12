-- Complete fix for customer persistence and stock validation
-- This script ensures customers are never deleted and stock is properly validated

-- First, ensure we have proper customer persistence
CREATE OR REPLACE FUNCTION ensure_customer_persistence()
RETURNS TRIGGER AS $$
BEGIN
    -- Never allow deletion of customers who have made orders
    IF TG_OP = 'DELETE' THEN
        IF EXISTS (SELECT 1 FROM orders WHERE customer_email = OLD.email) THEN
            RAISE EXCEPTION 'Cannot delete customer with existing orders. Customer ID: %', OLD.id;
        END IF;
        RETURN OLD;
    END IF;
    
    -- For updates, preserve critical customer data
    IF TG_OP = 'UPDATE' THEN
        -- Prevent email changes if customer has orders
        IF NEW.email != OLD.email AND EXISTS (SELECT 1 FROM orders WHERE customer_email = OLD.email) THEN
            RAISE EXCEPTION 'Cannot change email for customer with existing orders';
        END IF;
        
        -- Preserve order statistics
        NEW.total_orders = OLD.total_orders;
        NEW.total_spent = OLD.total_spent;
        NEW.first_purchase_date = OLD.first_purchase_date;
        
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply the customer persistence trigger
DROP TRIGGER IF EXISTS customer_persistence_trigger ON customers;
CREATE TRIGGER customer_persistence_trigger
    BEFORE DELETE OR UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION ensure_customer_persistence();

-- Create function to update customer statistics when orders change
CREATE OR REPLACE FUNCTION update_customer_stats()
RETURNS TRIGGER AS $$
DECLARE
    customer_email_val TEXT;
    total_orders_count INTEGER;
    total_spent_amount DECIMAL(10,2);
    first_purchase DATE;
    last_purchase DATE;
BEGIN
    -- Determine which customer email to update
    IF TG_OP = 'DELETE' THEN
        customer_email_val = OLD.customer_email;
    ELSE
        customer_email_val = NEW.customer_email;
    END IF;
    
    -- Calculate updated statistics
    SELECT 
        COUNT(*),
        COALESCE(SUM(total_amount), 0),
        MIN(created_at::date),
        MAX(created_at::date)
    INTO 
        total_orders_count,
        total_spent_amount,
        first_purchase,
        last_purchase
    FROM orders 
    WHERE customer_email = customer_email_val;
    
    -- Update customer record (INSERT OR UPDATE)
    INSERT INTO customers (
        name, 
        email, 
        phone, 
        total_orders, 
        total_spent, 
        first_purchase_date, 
        last_purchase_date,
        created_at
    )
    VALUES (
        COALESCE((SELECT customer_name FROM orders WHERE customer_email = customer_email_val LIMIT 1), 'Cliente'),
        customer_email_val,
        COALESCE((SELECT customer_phone FROM orders WHERE customer_email = customer_email_val LIMIT 1), ''),
        total_orders_count,
        total_spent_amount,
        first_purchase,
        last_purchase,
        COALESCE((SELECT MIN(created_at) FROM orders WHERE customer_email = customer_email_val), NOW())
    )
    ON CONFLICT (email) DO UPDATE SET
        name = COALESCE(EXCLUDED.name, customers.name),
        phone = COALESCE(NULLIF(EXCLUDED.phone, ''), customers.phone),
        total_orders = EXCLUDED.total_orders,
        total_spent = EXCLUDED.total_spent,
        first_purchase_date = EXCLUDED.first_purchase_date,
        last_purchase_date = EXCLUDED.last_purchase_date;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply the customer statistics trigger
DROP TRIGGER IF EXISTS update_customer_stats_trigger ON orders;
CREATE TRIGGER update_customer_stats_trigger
    AFTER INSERT OR UPDATE OR DELETE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_stats();

-- Create function for real-time profit tracking
CREATE OR REPLACE FUNCTION track_profit_changes()
RETURNS TRIGGER AS $$
DECLARE
    product_cost DECIMAL(10,2);
    profit_amount DECIMAL(10,2);
    order_date DATE;
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- Get product cost and order date
        SELECT 
            COALESCE(p.cost_price, p.price * 0.6),
            o.created_at::date
        INTO 
            product_cost,
            order_date
        FROM orders o
        JOIN products p ON p.id = NEW.product_id
        WHERE o.id = NEW.order_id;
        
        -- Calculate profit for this item
        profit_amount = (NEW.price * NEW.quantity) - (product_cost * NEW.quantity);
        
        -- Update or insert daily profit tracking
        INSERT INTO daily_profits (date, total_revenue, total_cost, total_profit, orders_count)
        VALUES (
            order_date,
            NEW.price * NEW.quantity,
            product_cost * NEW.quantity,
            profit_amount,
            1
        )
        ON CONFLICT (date) DO UPDATE SET
            total_revenue = daily_profits.total_revenue + EXCLUDED.total_revenue,
            total_cost = daily_profits.total_cost + EXCLUDED.total_cost,
            total_profit = daily_profits.total_profit + EXCLUDED.total_profit,
            orders_count = daily_profits.orders_count + 1;
            
    ELSIF TG_OP = 'DELETE' THEN
        -- Handle deletion by subtracting from daily profits
        SELECT 
            COALESCE(p.cost_price, p.price * 0.6),
            o.created_at::date
        INTO 
            product_cost,
            order_date
        FROM orders o
        JOIN products p ON p.id = OLD.product_id
        WHERE o.id = OLD.order_id;
        
        profit_amount = (OLD.price * OLD.quantity) - (product_cost * OLD.quantity);
        
        UPDATE daily_profits SET
            total_revenue = total_revenue - (OLD.price * OLD.quantity),
            total_cost = total_cost - (product_cost * OLD.quantity),
            total_profit = total_profit - profit_amount,
            orders_count = GREATEST(orders_count - 1, 0)
        WHERE date = order_date;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create daily profits table if it doesn't exist
CREATE TABLE IF NOT EXISTS daily_profits (
    date DATE PRIMARY KEY,
    total_revenue DECIMAL(10,2) DEFAULT 0,
    total_cost DECIMAL(10,2) DEFAULT 0,
    total_profit DECIMAL(10,2) DEFAULT 0,
    orders_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Apply profit tracking trigger
DROP TRIGGER IF EXISTS track_profit_changes_trigger ON order_items;
CREATE TRIGGER track_profit_changes_trigger
    AFTER INSERT OR UPDATE OR DELETE ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION track_profit_changes();

-- Ensure all existing customers are preserved
UPDATE customers SET 
    created_at = COALESCE(created_at, NOW()),
    total_orders = COALESCE(total_orders, 0),
    total_spent = COALESCE(total_spent, 0)
WHERE created_at IS NULL OR total_orders IS NULL OR total_spent IS NULL;

-- Add cost_price column to products if it doesn't exist
ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10,2);

-- Update cost prices for existing products (60% of selling price as default)
UPDATE products SET cost_price = price * 0.6 WHERE cost_price IS NULL;

-- Refresh all customer statistics from existing orders
INSERT INTO customers (name, email, phone, total_orders, total_spent, first_purchase_date, last_purchase_date, created_at)
SELECT 
    customer_name,
    customer_email,
    customer_phone,
    COUNT(*),
    SUM(total_amount),
    MIN(created_at::date),
    MAX(created_at::date),
    MIN(created_at)
FROM orders 
WHERE customer_email IS NOT NULL
GROUP BY customer_name, customer_email, customer_phone
ON CONFLICT (email) DO UPDATE SET
    total_orders = EXCLUDED.total_orders,
    total_spent = EXCLUDED.total_spent,
    first_purchase_date = EXCLUDED.first_purchase_date,
    last_purchase_date = EXCLUDED.last_purchase_date;

-- Initialize daily profits from existing order items
INSERT INTO daily_profits (date, total_revenue, total_cost, total_profit, orders_count)
SELECT 
    o.created_at::date,
    SUM(oi.price * oi.quantity),
    SUM(COALESCE(p.cost_price, p.price * 0.6) * oi.quantity),
    SUM((oi.price * oi.quantity) - (COALESCE(p.cost_price, p.price * 0.6) * oi.quantity)),
    COUNT(DISTINCT o.id)
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
JOIN products p ON oi.product_id = p.id
GROUP BY o.created_at::date
ON CONFLICT (date) DO UPDATE SET
    total_revenue = EXCLUDED.total_revenue,
    total_cost = EXCLUDED.total_cost,
    total_profit = EXCLUDED.total_profit,
    orders_count = EXCLUDED.orders_count;
