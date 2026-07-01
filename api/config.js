const { supabase, supabaseAdmin } = require('./supabase-client');

const DEFAULTS = {
  company_name: 'Isinet Soluciones Informáticas',
  phone: '+56 9 1234 5678',
  email: 'contacto@isinet.cl',
  whatsapp: '+56912345678',
  address: 'Av. Tecnología 1234, Santiago, Chile',
  description: 'Soluciones de soporte técnico informático para empresas y hogares.',
  hours: 'Lun-Vie: 9:00-18:00 | Sáb: 9:00-14:00',
  map_lat: '-33.4489',
  map_lng: '-70.6693',
  logo_url: '',
  social_facebook: 'https://facebook.com/isinet',
  social_instagram: 'https://instagram.com/isinet',
  social_linkedin: 'https://linkedin.com/company/isinet'
};

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase.from('site_config').select('key, value');
      if (error) throw error;
      const config = { ...DEFAULTS };
      if (data) data.forEach(row => { config[row.key] = row.value; });
      return res.status(200).json(config);
    } catch (e) {
      return res.status(200).json(DEFAULTS);
    }
  }

  if (req.method === 'PUT') {
    try {
      const updates = req.body || {};
      const rows = Object.entries(updates).map(([key, value]) => ({ key, value, updated_at: new Date().toISOString() }));
      const { error } = await supabaseAdmin.from('site_config').upsert(rows, { onConflict: 'key' });
      if (error) throw error;
      return res.status(200).json(updates);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
};
