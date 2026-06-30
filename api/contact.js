const fs = require('fs');
const path = require('path');
const { authMiddleware } = require('./auth/verify');

const DATA_DIR = path.join('/tmp', 'soportemax-data');
const FILE = path.join(DATA_DIR, 'messages.json');

function ensureDataDir() { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true }); }

function getMessages() {
  if (!fs.existsSync(FILE)) return [];
  return JSON.parse(fs.readFileSync(FILE, 'utf8'));
}

function saveMessages(data) { fs.writeFileSync(FILE, JSON.stringify(data, null, 2)); }

function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[<>]/g, '').trim().slice(0, 2000);
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  ensureDataDir();

  // Public: anyone can submit
  if (req.method === 'POST') {
    const { name, email, phone, message } = req.body || {};
    if (!name || !email || !message) return res.status(400).json({ error: 'Nombre, email y mensaje requeridos' });
    if (!email.includes('@')) return res.status(400).json({ error: 'Email inválido' });

    const messages = getMessages();
    const msg = {
      id: Date.now().toString(),
      name: sanitize(name),
      email: sanitize(email),
      phone: sanitize(phone || ''),
      message: sanitize(message),
      read: false,
      created_at: new Date().toISOString()
    };
    messages.push(msg);
    saveMessages(messages);
    return res.status(201).json({ ok: true, message: 'Mensaje enviado correctamente' });
  }

  // Admin only: list messages
  if (req.method === 'GET') {
    const user = authMiddleware(req);
    if (!user) return res.status(401).json({ error: 'No autorizado' });
    return res.status(200).json(getMessages().reverse());
  }

  res.status(405).json({ error: 'Method not allowed' });
};
