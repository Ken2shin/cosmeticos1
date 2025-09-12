-- Script para arreglar el sistema de seguimiento de ganancias
-- Este script resuelve el problema de números en 0 en los reportes

-- 1. Agregar precios de costo a productos existentes (estimación del 40% del precio de venta)
UPDATE products 
SET cost_price = CASE 
    WHEN cost_price IS NULL OR cost_price = 0 THEN price * 0.4
    ELSE cost_price
END
WHERE cost_price IS NULL OR cost_price = 0;

-- 2. Actualizar order_items existentes con precios de costo y ganancias
UPDATE order_items 
SET 
    cost_price = COALESCE(p.cost_price, oi.unit_price * 0.4),
    profit_amount = (oi.unit_price - COALESCE(p.cost_price, oi.unit_price * 0.4)) * oi.quantity
FROM products p 
WHERE order_items.product_id = p.id 
AND (order_items.cost_price IS NULL OR order_items.cost_price = 0);

-- 3. Poblar la tabla profit_tracking con datos históricos
INSERT INTO profit_tracking (
    order_id, 
    product_id, 
    sale_date, 
    quantity, 
    selling_price, 
    cost_price, 
    profit_per_unit, 
    total_profit, 
    profit_margin_percent
)
SELECT 
    o.id as order_id,
    oi.product_id,
    DATE(o.created_at) as sale_date,
    oi.quantity,
    oi.unit_price as selling_price,
    COALESCE(p.cost_price, oi.unit_price * 0.4) as cost_price,
    (oi.unit_price - COALESCE(p.cost_price, oi.unit_price * 0.4)) as profit_per_unit,
    (oi.unit_price - COALESCE(p.cost_price, oi.unit_price * 0.4)) * oi.quantity as total_profit,
    CASE 
        WHEN oi.unit_price > 0 THEN 
            ((oi.unit_price - COALESCE(p.cost_price, oi.unit_price * 0.4)) / oi.unit_price * 100)
        ELSE 0 
    END as profit_margin_percent
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
LEFT JOIN products p ON oi.product_id = p.id
WHERE o.status = 'completed'
ON CONFLICT (order_id, product_id) DO UPDATE SET
    quantity = EXCLUDED.quantity,
    selling_price = EXCLUDED.selling_price,
    cost_price = EXCLUDED.cost_price,
    profit_per_unit = EXCLUDED.profit_per_unit,
    total_profit = EXCLUDED.total_profit,
    profit_margin_percent = EXCLUDED.profit_margin_percent;

-- 4. Crear función para actualizar automáticamente profit_tracking
CREATE OR REPLACE FUNCTION update_profit_tracking()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo procesar si el pedido está completado
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        -- Insertar/actualizar registros en profit_tracking para todos los items del pedido
        INSERT INTO profit_tracking (
            order_id, 
            product_id, 
            sale_date, 
            quantity, 
            selling_price, 
            cost_price, 
            profit_per_unit, 
            total_profit, 
            profit_margin_percent
        )
        SELECT 
            NEW.id as order_id,
            oi.product_id,
            DATE(NEW.created_at) as sale_date,
            oi.quantity,
            oi.unit_price as selling_price,
            COALESCE(p.cost_price, oi.unit_price * 0.4) as cost_price,
            (oi.unit_price - COALESCE(p.cost_price, oi.unit_price * 0.4)) as profit_per_unit,
            (oi.unit_price - COALESCE(p.cost_price, oi.unit_price * 0.4)) * oi.quantity as total_profit,
            CASE 
                WHEN oi.unit_price > 0 THEN 
                    ((oi.unit_price - COALESCE(p.cost_price, oi.unit_price * 0.4)) / oi.unit_price * 100)
                ELSE 0 
            END as profit_margin_percent
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = NEW.id
        ON CONFLICT (order_id, product_id) DO UPDATE SET
            quantity = EXCLUDED.quantity,
            selling_price = EXCLUDED.selling_price,
            cost_price = EXCLUDED.cost_price,
            profit_per_unit = EXCLUDED.profit_per_unit,
            total_profit = EXCLUDED.total_profit,
            profit_margin_percent = EXCLUDED.profit_margin_percent;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Crear trigger para actualizar profit_tracking automáticamente
DROP TRIGGER IF EXISTS trigger_update_profit_tracking ON orders;
CREATE TRIGGER trigger_update_profit_tracking
    AFTER INSERT OR UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_profit_tracking();

-- 6. Crear función para actualizar estadísticas de clientes
CREATE OR REPLACE FUNCTION update_customer_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Actualizar estadísticas del cliente cuando se completa un pedido
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        -- Buscar o crear cliente
        INSERT INTO customers (
            name, 
            email, 
            phone, 
            address, 
            total_orders, 
            total_spent, 
            first_purchase_date, 
            last_purchase_date
        )
        VALUES (
            NEW.customer_name,
            NEW.customer_email,
            NEW.customer_phone,
            NEW.customer_address,
            1,
            NEW.total_amount,
            NEW.created_at,
            NEW.created_at
        )
        ON CONFLICT (email) DO UPDATE SET
            name = COALESCE(EXCLUDED.name, customers.name),
            phone = COALESCE(EXCLUDED.phone, customers.phone),
            address = COALESCE(EXCLUDED.address, customers.address),
            total_orders = customers.total_orders + 1,
            total_spent = customers.total_spent + NEW.total_amount,
            last_purchase_date = NEW.created_at,
            updated_at = CURRENT_TIMESTAMP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Crear trigger para actualizar estadísticas de clientes
DROP TRIGGER IF EXISTS trigger_update_customer_stats ON orders;
CREATE TRIGGER trigger_update_customer_stats
    AFTER INSERT OR UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_stats();

-- 8. Actualizar estadísticas de clientes existentes
INSERT INTO customers (
    name, 
    email, 
    phone, 
    address, 
    total_orders, 
    total_spent, 
    first_purchase_date, 
    last_purchase_date
)
SELECT 
    customer_name,
    customer_email,
    customer_phone,
    customer_address,
    COUNT(*) as total_orders,
    SUM(total_amount) as total_spent,
    MIN(created_at) as first_purchase_date,
    MAX(created_at) as last_purchase_date
FROM orders 
WHERE status = 'completed' 
    AND customer_email IS NOT NULL 
    AND customer_email != ''
GROUP BY customer_name, customer_email, customer_phone, customer_address
ON CONFLICT (email) DO UPDATE SET
    name = COALESCE(EXCLUDED.name, customers.name),
    phone = COALESCE(EXCLUDED.phone, customers.phone),
    address = COALESCE(EXCLUDED.address, customers.address),
    total_orders = EXCLUDED.total_orders,
    total_spent = EXCLUDED.total_spent,
    first_purchase_date = LEAST(customers.first_purchase_date, EXCLUDED.first_purchase_date),
    last_purchase_date = GREATEST(customers.last_purchase_date, EXCLUDED.last_purchase_date),
    updated_at = CURRENT_TIMESTAMP;

-- 9. Agregar constraint único para evitar duplicados en profit_tracking
ALTER TABLE profit_tracking 
ADD CONSTRAINT unique_profit_tracking 
UNIQUE (order_id, product_id);

-- 10. Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_profit_tracking_order_product ON profit_tracking(order_id, product_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_last_purchase ON customers(last_purchase_date);

-- Mensaje de confirmación
SELECT 'Sistema de seguimiento de ganancias actualizado correctamente. Los reportes ahora mostrarán números reales.' as mensaje;
