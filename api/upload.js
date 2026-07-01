const { supabaseAdmin } = require('./supabase-client');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { key, dataurl } = req.body || {};
  if (!key || !dataurl) return res.status(400).json({ error: 'Need key and dataurl' });

  try {
    // Save data URL directly to config
    const { error } = await supabaseAdmin.from('site_config').upsert(
      { key: 'replace_' + key, value: dataurl, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    );
    if (error) throw error;
    return res.status(200).json({ ok: true, key: 'replace_' + key });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
