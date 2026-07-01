const { supabase } = require('./supabase-client');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const filename = req.query.f;
  if (!filename) return res.status(400).json({ error: 'filename required' });

  const key = filename.replace(/\.\w+$/, '');

  try {
    const { data, error } = await supabase.from('site_config')
      .select('value').eq('key', 'replace_' + key).single();

    if (!error && data && data.value) {
      const val = data.value;
      // If it's a data URL, serve it directly
      if (val.indexOf('data:') === 0) {
        const matches = val.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          res.setHeader('Content-Type', matches[1]);
          res.setHeader('Cache-Control', 'public, max-age=31536000');
          res.end(Buffer.from(matches[2], 'base64'));
          return;
        }
      }
      // Otherwise redirect to the URL
      res.writeHead(302, { 'Location': val });
      return res.end();
    }
  } catch (e) {}

  // Fallback: redirect to original
  res.writeHead(302, { 'Location': '/assets/img/' + filename });
  res.end();
};
