const fs = require('fs');
const path = require('path');
const { authMiddleware } = require('./auth/verify');
const { supabaseAdmin } = require('./supabase-client');

const DATA_DIR = path.join('/tmp', 'isinet-data');
function ensureDataDir() { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true }); }

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  ensureDataDir();

  const FILE = path.join(DATA_DIR, 'images.json');

  // GET: return saved image overrides and hidden list
  if (req.method === 'GET') {
    try {
      const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
      return res.status(200).json(data);
    } catch(e) {
      return res.status(200).json({ replaces: {}, hidden: [] });
    }
  }

  // PUT: save image overrides and hidden list
  if (req.method === 'PUT') {
    const user = authMiddleware(req);
    if (!user) return res.status(401).json({ error: 'No autorizado' });
    try {
      fs.writeFileSync(FILE, JSON.stringify(req.body));
      return res.status(200).json({ ok: true });
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // POST: upload a single image to Supabase storage and return the public URL
  if (req.method === 'POST') {
    const user = authMiddleware(req);
    if (!user) return res.status(401).json({ error: 'No autorizado' });

    const { filename, dataurl } = req.body;
    if (!filename || !dataurl) return res.status(400).json({ error: 'filename y dataurl requeridos' });

    // Convert data URL to buffer
    const base64 = dataurl.split(',')[1];
    const buffer = Buffer.from(base64, 'base64');

    // Upload to Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from('site-images')
      .upload('replaces/' + filename, buffer, {
        contentType: 'image/' + (filename.split('.').pop() || 'jpeg'),
        upsert: true
      });

    if (error) return res.status(500).json({ error: error.message });

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('site-images')
      .getPublicUrl('replaces/' + filename);

    return res.status(200).json({ url: urlData.publicUrl });
  }

  res.status(405).json({ error: 'Method not allowed' });
};
