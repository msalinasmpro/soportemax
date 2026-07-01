const { supabase, supabaseAdmin } = require('./supabase-client');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'POST') {
    const { name, email, phone, message } = req.body || {};
    if (!name || !email || !message) return res.status(400).json({ error: 'Nombre, email y mensaje requeridos' });

    const { data, error } = await supabaseAdmin.from('contact_messages').insert({
      name: String(name).slice(0, 200),
      email: String(email).slice(0, 200),
      phone: String(phone || '').slice(0, 50),
      message: String(message).slice(0, 2000)
    });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ ok: true, message: 'Mensaje enviado correctamente' });
  }

  if (req.method === 'GET') {
    const { data } = await supabaseAdmin.from('contact_messages').select('*').order('created_at', { ascending: false });
    return res.status(200).json(data || []);
  }

  res.status(405).json({ error: 'Method not allowed' });
};
