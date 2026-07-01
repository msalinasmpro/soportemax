const { supabase } = require('./supabase-client');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const filename = req.query.f;
  if (!filename) return res.status(400).json({ error: 'filename required' });

  const key = filename.replace(/\.\w+$/, '');

  try {
    // Look up replacement by key (replace_hero-main)
    const { data, error } = await supabase.from('site_config')
      .select('value').eq('key', 'replace_' + key).single();

    if (!error && data && data.value) {
      res.writeHead(302, { 'Location': data.value });
      return res.end();
    }
  } catch (e) {}

  // Fallback: redirect to original
  res.writeHead(302, { 'Location': '/assets/img/' + filename });
  res.end();
};
