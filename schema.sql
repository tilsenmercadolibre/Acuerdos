-- Habilitar UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabla Marcas
CREATE TABLE marcas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL UNIQUE,
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla Calibres
CREATE TABLE calibres (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL UNIQUE,
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla Articulos
CREATE TABLE articulos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  marca_id UUID REFERENCES marcas(id) ON DELETE SET NULL,
  calibre_id UUID REFERENCES calibres(id) ON DELETE SET NULL,
  tipo TEXT,
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla Clientes
CREATE TABLE clientes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  codigo TEXT NOT NULL UNIQUE,
  email TEXT,
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla Contratos
CREATE TABLE contratos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organizacion TEXT NOT NULL,
  creador TEXT NOT NULL,
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  fecha_inicio DATE,
  fecha_vencimiento DATE,
  descripcion TEXT,
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla Aportes
CREATE TABLE contrato_aportes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contrato_id UUID REFERENCES contratos(id) ON DELETE CASCADE,
  articulo_id UUID REFERENCES articulos(id) ON DELETE CASCADE,
  cantidad INTEGER NOT NULL
);

-- Tabla Descuentos
CREATE TABLE contrato_descuentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contrato_id UUID REFERENCES contratos(id) ON DELETE CASCADE,
  articulo_id UUID REFERENCES articulos(id) ON DELETE CASCADE,
  descuento NUMERIC NOT NULL
);

-- Insertar datos de ejemplo
INSERT INTO marcas (nombre) VALUES ('Zillertal'), ('Stella Artois'), ('Corona'), ('Patagonia');
INSERT INTO calibres (nombre) VALUES ('330 cc'), ('450 cc'), ('1 Litro');
