const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join('/tmp', 'isinet-data');
const { authMiddleware } = require('./auth/verify');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function getConfig() {
  const file = path.join(DATA_DIR, 'config.json');
  if (!fs.existsSync(file)) {
    const defaults = {
      company_name: 'SoporteMax',
      phone: '+56 9 1234 5678',
      email: 'contacto@soportemax.cl',
      whatsapp: '+56912345678',
      address: 'Av. Tecnología 1234, Santiago, Chile',
      description: 'Soluciones de soporte técnico informático para empresas y hogares.',
      hours: 'Lun-Vie: 9:00-18:00 | Sáb: 9:00-14:00',
      map_lat: '-33.4489',
      map_lng: '-70.6693',
      seo_title: 'SoporteMax — Soporte Técnico Profesional',
      seo_description: 'Soluciones de soporte técnico informático para empresas y hogares.',
      social_facebook: 'https://facebook.com/soportemax',
      social_instagram: 'https://instagram.com/soportemax',
      social_linkedin: 'https://linkedin.com/company/soportemax',
      social_youtube: 'https://youtube.com/@soportemax'
    };
    fs.writeFileSync(file, JSON.stringify(defaults, null, 2));
    return defaults;
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  ensureDataDir();

  if (req.method === 'GET') {
    return res.status(200).json(getConfig());
  }

  if (req.method === 'PUT') {
    const user = authMiddleware(req);
    if (!user) return res.status(401).json({ error: 'No autorizado' });
    const config = getConfig();
    const updated = { ...config, ...req.body };
    fs.writeFileSync(path.join(DATA_DIR, 'config.json'), JSON.stringify(updated, null, 2));
    return res.status(200).json(updated);
  }

  res.status(405).json({ error: 'Method not allowed' });
};
