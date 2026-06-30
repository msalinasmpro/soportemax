const fs = require('fs');
const path = require('path');
const { authMiddleware } = require('./auth/verify');

const DATA_DIR = path.join('/tmp', 'isinet-data');
const FILE = path.join(DATA_DIR, 'faqs.json');

function ensureDataDir() { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true }); }

function getData() {
  if (!fs.existsSync(FILE)) {
    const defaults = [
      { id: '1', question: '¿Cuánto tiempo tarda una reparación?', answer: 'La mayoría se completa en 24-48 horas.', sort_order: 1, active: true },
      { id: '2', question: '¿Ofrecen servicio a domicilio?', answer: 'Sí, servicio on-site para empresas y soporte remoto.', sort_order: 2, active: true },
      { id: '3', question: '¿Cuánto cuesta un diagnóstico?', answer: 'Gratuito para reparaciones aprobadas. $15.000 CLP sin reparación.', sort_order: 3, active: true },
      { id: '4', question: '¿Qué garantía ofrecen?', answer: '3 meses de garantía en todas las reparaciones.', sort_order: 4, active: true },
      { id: '5', question: '¿Pueden recuperar datos?', answer: 'Sí, 95% de éxito en recuperación de discos.', sort_order: 5, active: true }
    ];
    fs.writeFileSync(FILE, JSON.stringify(defaults, null, 2));
    return defaults;
  }
  return JSON.parse(fs.readFileSync(FILE, 'utf8'));
}

function saveData(data) { fs.writeFileSync(FILE, JSON.stringify(data, null, 2)); }

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  ensureDataDir();

  if (req.method === 'GET') return res.status(200).json(getData().filter(i => i.active));

  const user = authMiddleware(req);
  if (!user) return res.status(401).json({ error: 'No autorizado' });

  if (req.method === 'POST') {
    const items = getData();
    const item = { id: Date.now().toString(), ...req.body, sort_order: items.length + 1, active: true };
    items.push(item);
    saveData(items);
    return res.status(201).json(item);
  }

  if (req.method === 'PUT') {
    const items = getData();
    const idx = items.findIndex(i => i.id === req.body.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    items[idx] = { ...items[idx], ...req.body };
    saveData(items);
    return res.status(200).json(items[idx]);
  }

  if (req.method === 'DELETE') {
    const id = req.query.id || req.body?.id;
    let items = getData();
    items = items.filter(i => i.id !== id);
    saveData(items);
    return res.status(200).json({ ok: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
};
