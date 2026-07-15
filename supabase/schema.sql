-- ============================================
-- SoporteMax — Supabase Database Schema
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================

-- ============================================
-- 1. SITE CONFIG (key-value store)
-- ============================================
CREATE TABLE IF NOT EXISTS site_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE site_config ENABLE ROW LEVEL SECURITY;

-- Public read, admin write
CREATE POLICY "site_config_select" ON site_config FOR SELECT USING (true);
CREATE POLICY "site_config_insert" ON site_config FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "site_config_update" ON site_config FOR UPDATE USING (auth.role() = 'authenticated');

-- ============================================
-- 2. SERVICES
-- ============================================
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
CREATE POLICY "services_select" ON services FOR SELECT USING (active = true);
CREATE POLICY "services_all_auth" ON services FOR ALL USING (auth.role() = 'authenticated');

-- ============================================
-- 3. TESTIMONIALS
-- ============================================
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
CREATE POLICY "testimonials_select" ON testimonials FOR SELECT USING (active = true);
CREATE POLICY "testimonials_all_auth" ON testimonials FOR ALL USING (auth.role() = 'authenticated');

-- ============================================
-- 4. FAQS
-- ============================================
CREATE TABLE IF NOT EXISTS faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT,
  sort_order INT DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "faqs_select" ON faqs FOR SELECT USING (active = true);
CREATE POLICY "faqs_all_auth" ON faqs FOR ALL USING (auth.role() = 'authenticated');

-- ============================================
-- 5. GALLERY
-- ============================================
CREATE TABLE IF NOT EXISTS gallery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  image_url TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE gallery ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gallery_select" ON gallery FOR SELECT USING (active = true);
CREATE POLICY "gallery_all_auth" ON gallery FOR ALL USING (auth.role() = 'authenticated');

-- ============================================
-- 6. CONTACT MESSAGES
-- ============================================
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
-- Anyone can insert (contact form)
CREATE POLICY "contact_messages_insert" ON contact_messages FOR INSERT WITH CHECK (true);
-- Only admin can read
CREATE POLICY "contact_messages_select_auth" ON contact_messages FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "contact_messages_update_auth" ON contact_messages FOR UPDATE USING (auth.role() = 'authenticated');

-- ============================================
-- 7. MAP CONFIG
-- ============================================
CREATE TABLE IF NOT EXISTS map_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lat DECIMAL(10, 7) DEFAULT -33.4489,
  lng DECIMAL(10, 7) DEFAULT -70.6693,
  zoom INT DEFAULT 15,
  address TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE map_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "map_config_select" ON map_config FOR SELECT USING (true);
CREATE POLICY "map_config_all_auth" ON map_config FOR ALL USING (auth.role() = 'authenticated');

-- ============================================
-- 8. STORAGE BUCKET
-- ============================================
-- Run this via Supabase Dashboard → Storage → New Bucket
-- Bucket name: site-images
-- Public: true
-- File size limit: 5MB
-- Allowed MIME types: image/jpeg, image/png, image/webp, image/gif

-- Storage policies (run after creating bucket):
-- CREATE POLICY "site_images_select" ON storage.objects FOR SELECT USING (bucket_id = 'site-images');
-- CREATE POLICY "site_images_insert_auth" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'site-images' AND auth.role() = 'authenticated');
-- CREATE POLICY "site_images_delete_auth" ON storage.objects FOR DELETE USING (bucket_id = 'site-images' AND auth.role() = 'authenticated');

-- ============================================
-- 9. SEED DATA (optional — run to populate defaults)
-- ============================================
INSERT INTO site_config (key, value) VALUES
  ('company_name', '"SoporteMax"'),
  ('phone', '"+56 9 1234 5678"'),
  ('email', '"contacto@soportemax.cl"'),
  ('whatsapp', '"+56912345678"'),
  ('address', '"Av. Tecnología 1234, Santiago, Chile"'),
  ('hours', '"Lun-Vie: 9:00-18:00 | Sáb: 9:00-14:00"'),
  ('description', '"Soluciones de soporte técnico informático para empresas y hogares."'),
  ('map_lat', '-33.4489'),
  ('map_lng', '-70.6693'),
  ('seo_title', '"SoporteMax — Soporte Técnico Profesional"'),
  ('seo_description', '"Soluciones de soporte técnico informático para empresas y hogares."'),
  ('social_facebook', '"https://facebook.com/soportemax"'),
  ('social_instagram', '"https://instagram.com/soportemax"'),
  ('social_linkedin', '"https://linkedin.com/company/soportemax"')
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
  ('Carlos Mendoza', 'Gerente, TechCorp', 'SoporteMax transformó nuestra infraestructura de TI. El tiempo de respuesta es increíble y la calidad del servicio excepcional.', 5),
  ('María Fernández', 'Directora, InnovaLab', 'Llevan 3 años gestionando nuestro soporte técnico. Profesionales, confiables y siempre disponibles.', 5),
  ('Roberto Silva', 'CEO, DataFlow', 'Recuperaron datos críticos que pensábamos perdidos. Su equipo es altamente capacitado.', 5)
ON CONFLICT DO NOTHING;

-- Default FAQs
INSERT INTO faqs (question, answer, sort_order) VALUES
  ('¿Cuánto tiempo tarda una reparación?', 'La mayoría de las reparaciones se completan en 24-48 horas. Problemas más complejos pueden tomar hasta 3-5 días hábiles.', 1),
  ('¿Ofrecen servicio a domicilio?', 'Sí, contamos con servicio on-site para empresas y clientes premium. También ofrecemos soporte remoto.', 2),
  ('¿Cuánto cuesta un diagnóstico?', 'El diagnóstico es gratuito para reparaciones que se aprueben. Para diagnósticos sin reparación, el costo es de $15.000 CLP.', 3),
  ('¿Qué garantía ofrecen?', 'Todas nuestras reparaciones incluyen 3 meses de garantía.', 4),
  ('¿Pueden recuperar datos de discos dañados?', 'Sí, contamos con herramientas especializadas. Tenemos un 95% de éxito en recuperación.', 5)
ON CONFLICT DO NOTHING;

-- Default map config
INSERT INTO map_config (lat, lng, zoom, address) VALUES
  (-33.4489, -70.6693, 15, 'Av. Tecnología 1234, Santiago, Chile')
ON CONFLICT DO NOTHING;

-- ============================================
-- 10. CLIENTS (logo carousel)
-- ============================================
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  sort_order INT DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clients_select" ON clients FOR SELECT USING (active = true);
CREATE POLICY "clients_all_auth" ON clients FOR ALL USING (auth.role() = 'authenticated');
