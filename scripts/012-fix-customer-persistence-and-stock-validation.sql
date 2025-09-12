-- Script para arreglar la persistencia de clientes y validación de stock

-- Primero, asegurar que la tabla de clientes tenga la estructura correcta
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    address TEXT,
    total_orders INTEGER DEFAULT 0,
    total_spent DECIMAL(10,2) DEFAULT 0.00,
    first_purchase_date TIMESTAMP,
    last_purchase_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_last_purchase ON customers(last_purchase_date);

-- Función para actualizar automáticamente updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para actualizar updated_at en customers
DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Función mejorada para manejar clientes sin eliminar registros existentes
CREATE OR REPLACE FUNCTION upsert_customer_on_order()
RETURNS TRIGGER AS $$
BEGIN
    -- Insertar o actualizar cliente sin eliminar registros existentes
    INSERT INTO customers (name, email, phone, total_orders, total_spent, first_purchase_date, last_purchase_date)
    VALUES (
        NEW.customer_name, 
        COALESCE(NEW.customer_email, 'no-email@example.com'), 
        NEW.customer_phone, 
        1, 
        NEW.total_amount, 
        CURRENT_TIMESTAMP, 
        CURRENT_TIMESTAMP
    )
    ON CONFLICT (email) 
    DO UPDATE SET 
        -- Solo actualizar campos si no están vacíos
        name = CASE 
            WHEN TRIM(EXCLUDED.name) != '' AND EXCLUDED.name IS NOT NULL 
            THEN EXCLUDED.name 
            ELSE customers.name 
        END,
        phone = CASE 
            WHEN TRIM(EXCLUDED.phone) != '' AND EXCLUDED.phone IS NOT NULL 
            THEN EXCLUDED.phone 
            ELSE customers.phone 
        END,
        -- Siempre incrementar totales
        total_orders = customers.total_orders + 1,
        total_spent = customers.total_spent + NEW.total_amount,
        last_purchase_date = CURRENT_TIMESTAMP,
        -- Solo actualizar first_purchase_date si es NULL
        first_purchase_date = COALESCE(customers.first_purchase_date, CURRENT_TIMESTAMP);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recrear el trigger para órdenes
DROP TRIGGER IF EXISTS trigger_upsert_customer_on_order ON orders;
CREATE TRIGGER trigger_upsert_customer_on_order
    AFTER INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION upsert_customer_on_order();

-- Poblar clientes existentes desde órdenes si no existen
INSERT INTO customers (name, email, phone, total_orders, total_spent, first_purchase_date, last_purchase_date)
SELECT 
    o.customer_name,
    COALESCE(o.customer_email, 'no-email@example.com'),
    o.customer_phone,
    COUNT(*) as total_orders,
    SUM(o.total_amount) as total_spent,
    MIN(o.created_at) as first_purchase_date,
    MAX(o.created_at) as last_purchase_date
FROM orders o
WHERE NOT EXISTS (
    SELECT 1 FROM customers c 
    WHERE c.email = COALESCE(o.customer_email, 'no-email@example.com')
)
GROUP BY o.customer_name, COALESCE(o.customer_email, 'no-email@example.com'), o.customer_phone
ON CONFLICT (email) DO NOTHING;

-- Actualizar estadísticas de clientes existentes
UPDATE customers 
SET 
    total_orders = subquery.order_count,
    total_spent = subquery.total_amount,
    first_purchase_date = COALESCE(customers.first_purchase_date, subquery.first_order),
    last_purchase_date = subquery.last_order
FROM (
    SELECT 
        COALESCE(o.customer_email, 'no-email@example.com') as email,
        COUNT(*) as order_count,
        SUM(o.total_amount) as total_amount,
        MIN(o.created_at) as first_order,
        MAX(o.created_at) as last_order
    FROM orders o
    GROUP BY COALESCE(o.customer_email, 'no-email@example.com')
) subquery
WHERE customers.email = subquery.email;

-- Asegurar que todos los productos tengan cost_price
UPDATE products 
SET cost_price = CASE 
    WHEN cost_price IS NULL OR cost_price = 0 
    THEN price * 0.6  -- 40% de margen por defecto
    ELSE cost_price 
END
WHERE cost_price IS NULL OR cost_price = 0;

-- Función para validar stock antes de crear órdenes
CREATE OR REPLACE FUNCTION validate_stock_before_order()
RETURNS TRIGGER AS $$
DECLARE
    item_record RECORD;
    current_stock INTEGER;
    product_name VARCHAR(255);
BEGIN
    -- Validar stock para cada item en la orden
    FOR item_record IN 
        SELECT oi.product_id, oi.quantity 
        FROM order_items oi 
        WHERE oi.order_id = NEW.id
    LOOP
        -- Obtener stock actual del producto
        SELECT stock_quantity, name INTO current_stock, product_name
        FROM products 
        WHERE id = item_record.product_id AND is_active = true;
        
        -- Si no se encuentra el producto o no hay suficiente stock
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Producto con ID % no encontrado o inactivo', item_record.product_id;
        END IF;
        
        IF current_stock < item_record.quantity THEN
            RAISE EXCEPTION 'Stock insuficiente para %. Disponible: %, Solicitado: %', 
                product_name, current_stock, item_record.quantity;
        END IF;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar stock (se ejecuta después de insertar order_items)
DROP TRIGGER IF EXISTS validate_stock_trigger ON orders;
CREATE TRIGGER validate_stock_trigger
    AFTER INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION validate_stock_before_order();

-- Crear vista para reportes en tiempo real
CREATE OR REPLACE VIEW real_time_profit_report AS
SELECT 
    o.id as order_id,
    o.customer_name,
    o.customer_email,
    o.total_amount,
    o.status,
    o.created_at,
    oi.product_id,
    oi.quantity,
    oi.unit_price,
    oi.total_price,
    p.name as product_name,
    p.cost_price,
    (oi.unit_price - COALESCE(p.cost_price, 0)) * oi.quantity as real_profit,
    CASE 
        WHEN oi.unit_price > 0 THEN ((oi.unit_price - COALESCE(p.cost_price, 0)) / oi.unit_price * 100)
        ELSE 0
    END as real_profit_margin
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
LEFT JOIN products p ON oi.product_id = p.id
WHERE o.status = 'completed';

-- Insertar datos de prueba si no existen clientes
INSERT INTO customers (name, email, phone, total_orders, total_spent, first_purchase_date, last_purchase_date)
SELECT 'Cliente de Prueba', 'cliente@ejemplo.com', '8888-8888', 0, 0.00, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM customers LIMIT 1);

COMMIT;
