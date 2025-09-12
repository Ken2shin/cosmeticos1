-- Agregando tabla de monedas con banderas
CREATE TABLE IF NOT EXISTS currencies (
  id SERIAL PRIMARY KEY,
  code VARCHAR(3) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  symbol VARCHAR(10) NOT NULL,
  flag_emoji VARCHAR(10) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar monedas principales
INSERT INTO currencies (code, name, symbol, flag_emoji) VALUES
('USD', 'Dólar Estadounidense', '$', '🇺🇸'),
('NIO', 'Córdoba Nicaragüense', 'C$', '🇳🇮')
ON CONFLICT (code) DO NOTHING;

-- Agregando columna de moneda a productos
ALTER TABLE products ADD COLUMN IF NOT EXISTS currency_code VARCHAR(3) DEFAULT 'USD';
ALTER TABLE products ADD FOREIGN KEY (currency_code) REFERENCES currencies(code);

-- Crear tabla de categorías si no existe
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar categorías por defecto
INSERT INTO categories (name, description) VALUES
('Labiales', 'Productos para labios'),
('Base de Maquillaje', 'Bases y correctores'),
('Sombras', 'Sombras para ojos'),
('Máscaras', 'Máscaras de pestañas'),
('Rubor', 'Rubores y coloretes'),
('Cejas', 'Productos para cejas'),
('Skincare', 'Cuidado de la piel')
ON CONFLICT (name) DO NOTHING;

-- Tabla para suscripciones push
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id SERIAL PRIMARY KEY,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_type VARCHAR(20) NOT NULL DEFAULT 'client', -- 'client' o 'admin'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(endpoint)
);
