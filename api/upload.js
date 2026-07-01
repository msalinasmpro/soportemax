const { supabaseAdmin } = require('./supabase-client');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { filename, dataurl } = req.body || {};
  if (!filename || !dataurl) return res.status(400).json({ error: 'Need filename and dataurl' });

  try {
    const base64 = dataurl.split(',')[1];
    const ext = filename.split('.').pop() || 'jpg';
    const buffer = Buffer.from(base64, 'base64');
    const path = 'uploads/' + Date.now() + '-' + filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    
    const { error } = await supabaseAdmin.storage.from('site-images').upload(path, buffer, { contentType: 'image/' + ext, upsert: true });
    if (error) return res.status(500).json({ error: error.message });
    
    const { data: urlData } = supabaseAdmin.storage.from('site-images').getPublicUrl(path);
    return res.status(200).json({ url: urlData.publicUrl });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
