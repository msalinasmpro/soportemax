const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join('/tmp', 'soportemax-data');
const SECRET = process.env.JWT_SECRET || 'soportemax-secret-key-change-in-production';

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function getUsers() {
  const file = path.join(DATA_DIR, 'users.json');
  if (!fs.existsSync(file)) {
    const defaults = [
      { id: '1', email: 'admin@soportemax.cl', password: hashPassword('admin123'), name: 'Administrador', role: 'admin' }
    ];
    fs.writeFileSync(file, JSON.stringify(defaults, null, 2));
    return defaults;
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function hashPassword(pw) {
  return crypto.createHash('sha256').update(pw).digest('hex');
}

function generateToken(user) {
  const payload = { id: user.id, email: user.email, role: user.role, exp: Date.now() + 24 * 60 * 60 * 1000 };
  return Buffer.from(JSON.stringify(payload)).toString('base64') + '.' + crypto.createHash('sha256').update(JSON.stringify(payload) + SECRET).digest('hex');
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  ensureDataDir();
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email y contraseña requeridos' });

  const users = getUsers();
  const user = users.find(u => u.email === email && u.password === hashPassword(password));
  if (!user) return res.status(401).json({ error: 'Credenciales incorrectas' });

  const token = generateToken(user);
  res.status(200).json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
};
