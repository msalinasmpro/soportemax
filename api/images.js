const { authMiddleware } = require('./auth/verify');
const { supabaseAdmin } = require('./supabase-client');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET: return image overrides and hidden list from Supabase
  if (req.method === 'GET') {
    try {
      const { data, error } = await supabaseAdmin.from('site_config')
        .select('key, value')
        .in('key', ['image_replaces', 'image_hidden']);
      if (error) throw error;
      const result = { replaces: {}, hidden: [] };
      if (data) data.forEach(function(row) {
        if (row.key === 'image_replaces') result.replaces = row.value || {};
        if (row.key === 'image_hidden') result.hidden = row.value || [];
      });
      return res.status(200).json(result);
    } catch(e) {
      return res.status(200).json({ replaces: {}, hidden: [] });
    }
  }

  // PUT: save image overrides and hidden list to Supabase
  if (req.method === 'PUT') {
    const user = authMiddleware(req);
    if (!user) return res.status(401).json({ error: 'No autorizado' });
    try {
      const { replaces, hidden } = req.body;
      if (replaces !== undefined) {
        await supabaseAdmin.from('site_config')
          .upsert({ key: 'image_replaces', value: replaces, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      }
      if (hidden !== undefined) {
        await supabaseAdmin.from('site_config')
          .upsert({ key: 'image_hidden', value: hidden, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      }
      return res.status(200).json({ ok: true });
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // POST: upload image to Supabase Storage
  if (req.method === 'POST') {
    const user = authMiddleware(req);
    if (!user) return res.status(401).json({ error: 'No autorizado' });
    const { filename, dataurl } = req.body;
    if (!filename || !dataurl) return res.status(400).json({ error: 'filename and dataurl required' });
    try {
      const base64 = dataurl.split(',')[1];
      const ext = filename.split('.').pop() || 'jpg';
      const buffer = Buffer.from(base64, 'base64');
      const filePath = 'replaces/' + Date.now() + '-' + filename.replace(/[^a-zA-Z0-9.-]/g, '_');
      const { error } = await supabaseAdmin.storage
        .from('site-images')
        .upload(filePath, buffer, { contentType: 'image/' + ext, upsert: true });
      if (error) return res.status(500).json({ error: error.message });
      const { data: urlData } = supabaseAdmin.storage.from('site-images').getPublicUrl(filePath);
      return res.status(200).json({ url: urlData.publicUrl });
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
};
