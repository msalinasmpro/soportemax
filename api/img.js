const { supabase } = require('./supabase-client');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const filename = req.query.f;
  if (!filename) return res.status(400).json({ error: 'filename required' });

  try {
    // Look up replacement in site_config
    const key = filename.replace(/\.\w+$/, '');
    const { data } = await supabase.from('site_config')
      .select('value').eq('key', 'image_replaces').single();

    if (data && data.value && data.value[key]) {
      // Redirect to the replacement URL
      res.writeHead(302, { 'Location': data.value[key] });
      return res.end();
    }
  } catch (e) {}

  // Fallback: redirect to original
  res.writeHead(302, { 'Location': '/assets/img/' + filename });
  res.end();
};
