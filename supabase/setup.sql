-- ============================================
-- Isinet — Supabase Setup Script
-- Paste this in: Supabase Dashboard → SQL Editor → Run
-- ============================================

-- 1. SITE CONFIG
CREATE TABLE IF NOT EXISTS site_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE site_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "config_public_read" ON site_config FOR SELECT USING (true);
CREATE POLICY "config_auth_all" ON site_config FOR ALL USING (auth.role() = 'authenticated');

-- 2. SERVICES
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  image_url TEXT,
  sort_order INT DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "services_public_read" ON services FOR SELECT USING (active = true);
CREATE POLICY "services_auth_all" ON services FOR ALL USING (auth.role() = 'authenticated');

-- 3. TESTIMONIALS
CREATE TABLE IF NOT EXISTS testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT,
  comment TEXT,
  rating INT DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  avatar_url TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "testimonials_public_read" ON testimonials FOR SELECT USING (active = true);
CREATE POLICY "testimonials_auth_all" ON testimonials FOR ALL USING (auth.role() = 'authenticated');

-- 4. FAQS
CREATE TABLE IF NOT EXISTS faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT,
  sort_order INT DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "faqs_public_read" ON faqs FOR SELECT USING (active = true);
CREATE POLICY "faqs_auth_all" ON faqs FOR ALL USING (auth.role() = 'authenticated');

-- 5. GALLERY
CREATE TABLE IF NOT EXISTS gallery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  image_url TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE gallery ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gallery_public_read" ON gallery FOR SELECT USING (active = true);
CREATE POLICY "gallery_auth_all" ON gallery FOR ALL USING (auth.role() = 'authenticated');

-- 6. CONTACT MESSAGES
CREATE TABLE IF NOT EXISTS contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_insert" ON contact_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "messages_auth_read" ON contact_messages FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "messages_auth_update" ON contact_messages FOR UPDATE USING (auth.role() = 'authenticated');

-- 7. SEED DATA
INSERT INTO site_config (key, value) VALUES
  ('company_name', '"Isinet Soluciones Informáticas"'),
  ('phone', '"+56 9 1234 5678"'),
  ('email', '"contacto@isinet.cl"'),
  ('whatsapp', '"+56912345678"'),
  ('address', '"Av. Tecnología 1234, Santiago, Chile"'),
  ('hours', '"Lun-Vie: 9:00-18:00 | Sáb: 9:00-14:00"'),
  ('description', '"Soluciones de soporte técnico informático para empresas y hogares."'),
  ('map_lat', '"-33.4489"'),
  ('map_lng', '"-70.6693"'),
  ('logo_url', '""'),
  ('social_facebook', '"https://facebook.com/isinet"'),
  ('social_instagram', '"https://instagram.com/isinet"'),
  ('social_linkedin', '"https://linkedin.com/company/isinet"')
ON CONFLICT (key) DO NOTHING;

-- Default services
INSERT INTO services (title, description, icon, sort_order) VALUES
  ('Reparación de Computadores', 'Diagnóstico y reparación experta de desktops, laptops y workstations.', 'monitor', 1),
  ('Notebook', 'Reparación especializada de notebooks: pantallas, teclados, baterías.', 'laptop', 2),
  ('PC Gamer', 'Optimización y reparación de PC gaming para máximo rendimiento.', 'gamepad-2', 3),
  ('Soporte Empresas', 'Soporte técnico integral con contratos de mantención y SLA.', 'building-2', 4),
  ('Soporte Remoto', 'Resolvemos problemas de forma remota, rápida y segura.', 'wifi', 5),
  ('Respaldo de Información', 'Copias de seguridad automáticas y recuperación de datos.', 'hard-drive', 6),
  ('Eliminación de Virus', 'Eliminación completa de malware, ransomware y spyware.', 'shield-check', 7),
  ('Optimización', 'Optimización de rendimiento: limpieza, updates y configuración.', 'zap', 8),
  ('Instalación Windows', 'Instalación y configuración de Windows con drivers y updates.', 'download', 9),
  ('Redes', 'Diseño, cableado estructurado, switches, routers y WiFi.', 'network', 10),
  ('Servidores', 'Configuración y mantención de servidores con monitoreo 24/7.', 'server', 11),
  ('Mantención Preventiva', 'Programas de mantención para evitar fallos y auditoría técnica.', 'wrench', 12)
ON CONFLICT DO NOTHING;

-- Default testimonials
INSERT INTO testimonials (name, role, comment, rating) VALUES
  ('Carlos Mendoza', 'Gerente, TechCorp', 'Isinet transformó nuestra infraestructura de TI. Tiempo de respuesta increíble.', 5),
  ('María Fernández', 'Directora, InnovaLab', 'Llevan 3 años gestionando nuestro soporte. Profesionales y confiables.', 5),
  ('Roberto Silva', 'CEO, DataFlow', 'Recuperaron datos críticos que pensábamos perdidos. Servicio premium.', 5)
ON CONFLICT DO NOTHING;

-- Default FAQs
INSERT INTO faqs (question, answer, sort_order) VALUES
  ('¿Cuánto tiempo tarda una reparación?', 'La mayoría se completa en 24-48 horas. Problemas complejos hasta 3-5 días hábiles.', 1),
  ('¿Ofrecen servicio a domicilio?', 'Sí, servicio on-site para empresas y soporte remoto.', 2),
  ('¿Cuánto cuesta un diagnóstico?', 'Gratuito para reparaciones aprobadas. $15.000 CLP sin reparación.', 3),
  ('¿Qué garantía ofrecen?', '3 meses de garantía en todas las reparaciones.', 4),
  ('¿Pueden recuperar datos?', 'Sí, 95% de éxito en recuperación de discos duros y SSD.', 5)
ON CONFLICT DO NOTHING;

-- 8. CREATE ADMIN USER
-- Run this separately after creating the user in Authentication → Users
-- Replace the UUID with the actual user ID from Authentication
-- INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role)
-- VALUES ('UUID-AQUI', 'admin@isinet.cl', crypt('Isinet2026!', gen_salt('bf')), now(), 'authenticated');
