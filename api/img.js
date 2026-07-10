const { supabase } = require('./supabase-client');

function convertGoogleDriveUrl(url) {
  if (!url) return url;
  // Convert Google Drive share links to direct access
  // https://drive.google.com/file/d/FILE_ID/view?... -> https://drive.google.com/uc?export=view&id=FILE_ID
  var match = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return 'https://drive.google.com/uc?export=view&id=' + match[1];
  // Already a direct link
  if (url.indexOf('drive.google.com/uc') !== -1) return url;
  return url;
}

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
      if (val.indexOf('data:') === 0) {
        const matches = val.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          res.setHeader('Content-Type', matches[1]);
          res.setHeader('Cache-Control', 'public, max-age=31536000');
          res.end(Buffer.from(matches[2], 'base64'));
          return;
        }
      }
      // Handle Google Drive URLs
      var finalUrl = convertGoogleDriveUrl(val);
      res.writeHead(302, { 'Location': finalUrl });
      return res.end();
    }
  } catch (e) {}

  res.writeHead(302, { 'Location': '/assets/img/' + filename });
  res.end();
};
