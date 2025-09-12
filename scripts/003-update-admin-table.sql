-- Actualizando tabla de administrador para usar las credenciales del usuario
DROP TABLE IF EXISTS administrador;

CREATE TABLE administrador (
    id SERIAL PRIMARY KEY,
    correo VARCHAR(255) UNIQUE NOT NULL,
    contraseña TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO administrador (correo, contraseña) 
VALUES ('admin@ejemplo.com', 'password');

-- Agregando tabla para notificaciones push
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER REFERENCES administrador(id),
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Actualizando tabla de pedidos para incluir teléfono y estado de notificación
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notification_sent BOOLEAN DEFAULT FALSE;
