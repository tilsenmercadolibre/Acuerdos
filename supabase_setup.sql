-- Desactivar la seguridad a nivel de fila (RLS) en todas las tablas para permitir
-- que la aplicación React (frontend) pueda leer y escribir datos directamente.
-- Ejecute este script en el "SQL Editor" de su Dashboard de Supabase.

ALTER TABLE marcas DISABLE ROW LEVEL SECURITY;
ALTER TABLE calibres DISABLE ROW LEVEL SECURITY;
ALTER TABLE articulos DISABLE ROW LEVEL SECURITY;
ALTER TABLE clientes DISABLE ROW LEVEL SECURITY;
ALTER TABLE contratos DISABLE ROW LEVEL SECURITY;
ALTER TABLE contrato_aportes DISABLE ROW LEVEL SECURITY;
ALTER TABLE contrato_descuentos DISABLE ROW LEVEL SECURITY;

-- O alternativamente, si prefiere mantener RLS activo pero permitir acceso público:
/*
-- 1. Marcas
CREATE POLICY "Public Read marcas" ON marcas FOR SELECT USING (true);
CREATE POLICY "Public Write marcas" ON marcas FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update marcas" ON marcas FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete marcas" ON marcas FOR DELETE USING (true);

-- 2. Calibres
CREATE POLICY "Public Read calibres" ON calibres FOR SELECT USING (true);
CREATE POLICY "Public Write calibres" ON calibres FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update calibres" ON calibres FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete calibres" ON calibres FOR DELETE USING (true);

-- 3. Articulos
CREATE POLICY "Public Read articulos" ON articulos FOR SELECT USING (true);
CREATE POLICY "Public Write articulos" ON articulos FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update articulos" ON articulos FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete articulos" ON articulos FOR DELETE USING (true);

-- 4. Clientes
CREATE POLICY "Public Read clientes" ON clientes FOR SELECT USING (true);
CREATE POLICY "Public Write clientes" ON clientes FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update clientes" ON clientes FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete clientes" ON clientes FOR DELETE USING (true);

-- 5. Contratos
CREATE POLICY "Public Read contratos" ON contratos FOR SELECT USING (true);
CREATE POLICY "Public Write contratos" ON contratos FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update contratos" ON contratos FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete contratos" ON contratos FOR DELETE USING (true);

-- 6. Contrato Aportes
CREATE POLICY "Public Read contrato_aportes" ON contrato_aportes FOR SELECT USING (true);
CREATE POLICY "Public Write contrato_aportes" ON contrato_aportes FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update contrato_aportes" ON contrato_aportes FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete contrato_aportes" ON contrato_aportes FOR DELETE USING (true);

-- 7. Contrato Descuentos
CREATE POLICY "Public Read contrato_descuentos" ON contrato_descuentos FOR SELECT USING (true);
CREATE POLICY "Public Write contrato_descuentos" ON contrato_descuentos FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update contrato_descuentos" ON contrato_descuentos FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete contrato_descuentos" ON contrato_descuentos FOR DELETE USING (true);
*/
