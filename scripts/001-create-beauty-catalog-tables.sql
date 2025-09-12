-- Creating database schema for beauty product catalog
-- Products table for storing makeup and beauty items
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  category VARCHAR(100) NOT NULL,
  brand VARCHAR(100),
  image_url TEXT,
  stock_quantity INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Categories table for organizing products
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders table for customer purchases
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50),
  total_amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Order items table for products in each order
CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL
);

-- Insert default categories
INSERT INTO categories (name, description) VALUES
  ('Labiales', 'Labiales, glosses y productos para labios'),
  ('Base', 'Bases, correctores y productos para el rostro'),
  ('Ojos', 'Sombras, máscaras y productos para ojos'),
  ('Mejillas', 'Rubores, bronceadores y iluminadores'),
  ('Cejas', 'Productos para definir y dar forma a las cejas'),
  ('Herramientas', 'Brochas, esponjas y herramientas de maquillaje')
ON CONFLICT (name) DO NOTHING;

-- Insert sample products
INSERT INTO products (name, description, price, category, brand, image_url, stock_quantity) VALUES
  ('Labial Mate Rojo Clásico', 'Labial de larga duración con acabado mate en tono rojo clásico', 25.99, 'Labiales', 'Glamour Beauty', '/placeholder.svg?height=300&width=300', 50),
  ('Base Líquida Cobertura Total', 'Base de maquillaje líquida con cobertura completa y acabado natural', 35.50, 'Base', 'Perfect Skin', '/placeholder.svg?height=300&width=300', 30),
  ('Paleta de Sombras Neutras', 'Paleta con 12 tonos neutros perfectos para cualquier ocasión', 42.00, 'Ojos', 'Eye Magic', '/placeholder.svg?height=300&width=300', 25),
  ('Rubor en Polvo Rosa', 'Rubor en polvo compacto en tono rosa natural', 18.75, 'Mejillas', 'Blush Beauty', '/placeholder.svg?height=300&width=300', 40),
  ('Máscara de Pestañas Volumen', 'Máscara que proporciona volumen y longitud a las pestañas', 28.99, 'Ojos', 'Lash Pro', '/placeholder.svg?height=300&width=300', 35),
  ('Lápiz de Cejas Marrón', 'Lápiz retráctil para definir y rellenar las cejas', 15.50, 'Cejas', 'Brow Perfect', '/placeholder.svg?height=300&width=300', 60)
ON CONFLICT DO NOTHING;
