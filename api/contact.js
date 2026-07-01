const fs = require('fs');
const path = require('path');
const { authMiddleware } = require('./auth/verify');

const DATA_DIR = path.join('/tmp', 'isinet-data');
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

function getConfig() {
  const file = path.join(DATA_DIR, 'config.json');
  if (!fs.existsSync(file)) return {};
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

async function sendEmail(config, subject, htmlBody) {
  if (!config.smtp_host || !config.smtp_user || !config.smtp_pass || !config.smtp_to) {
    return { sent: false, reason: 'SMTP no configurado' };
  }
  try {
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: config.smtp_host,
      port: parseInt(config.smtp_port || '587'),
      secure: parseInt(config.smtp_port || '587') === 465,
      auth: { user: config.smtp_user, pass: config.smtp_pass }
    });
    await transporter.sendMail({
      from: config.smtp_from || config.smtp_user,
      to: config.smtp_to,
      subject: subject,
      html: htmlBody
    });
    return { sent: true };
  } catch (err) {
    return { sent: false, reason: err.message };
  }
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

    // Send email notification if SMTP is configured
    const config = getConfig();
    let emailResult = { sent: false, reason: 'Sin SMTP' };
    if (config.smtp_host) {
      const htmlBody = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <h2 style="color:#3B82F6;">Nuevo mensaje de contacto</h2>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;">Nombre:</td><td style="padding:8px;border-bottom:1px solid #eee;">${sanitize(name)}</td></tr>
            <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;">Email:</td><td style="padding:8px;border-bottom:1px solid #eee;">${sanitize(email)}</td></tr>
            <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;">Teléfono:</td><td style="padding:8px;border-bottom:1px solid #eee;">${sanitize(phone || 'No proporcionado')}</td></tr>
            <tr><td style="padding:8px;font-weight:bold;">Mensaje:</td><td style="padding:8px;">${sanitize(message)}</td></tr>
          </table>
          <p style="color:#999;font-size:12px;margin-top:20px;">${config.company_name || 'Isinet'} — Panel de administración</p>
        </div>`;
      emailResult = await sendEmail(config, `Nuevo contacto: ${sanitize(name)}`, htmlBody);
    }

    return res.status(201).json({ ok: true, message: 'Mensaje enviado correctamente', email: emailResult });
  }

  // Admin only: list messages
  if (req.method === 'GET') {
    const user = authMiddleware(req);
    if (!user) return res.status(401).json({ error: 'No autorizado' });
    return res.status(200).json(getMessages().reverse());
  }

  res.status(405).json({ error: 'Method not allowed' });
};
