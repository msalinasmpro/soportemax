const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');

// Load .env.local
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)="([^"]*)"/);
    if (match) process.env[match[1].trim()] = match[2];
  });
}

const PORT = 8765;
const VERCEL_URL = 'https://soportemax.vercel.app';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_KEY || '';
const CLIENTS_DIR = path.join(__dirname, 'assets', 'img', 'clients');

// Ensure clients directory exists
if (!fs.existsSync(CLIENTS_DIR)) fs.mkdirSync(CLIENTS_DIR, { recursive: true });

// Endpoints handled locally (not yet deployed to Vercel)
const LOCAL_ENDPOINTS = ['/api/clients'];

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.ico': 'image/x-icon'
};

function supabaseRequest(table, method, body, id) {
  return new Promise((resolve, reject) => {
    let url = `${SUPABASE_URL}/rest/v1/${table}`;
    if (id) url += `?id=eq.${id}`;
    const urlObj = new URL(url);

    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'apikey': SUPABASE_SERVICE,
        'Authorization': `Bearer ${SUPABASE_SERVICE}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { resolve(data); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Save data URL or URL to local file, return the file path
function saveLogoFile(logoData, clientId) {
  return new Promise((resolve, reject) => {
    // If it's already a relative path (not a data URL), keep it
    if (logoData && !logoData.startsWith('data:') && !logoData.startsWith('http')) {
      return resolve(logoData);
    }

    // If it's an external URL, download it
    if (logoData && logoData.startsWith('http')) {
      const ext = logoData.match(/\.(png|jpe?g|webp|avif|gif|svg)/i)?.[1] || 'png';
      const filename = `client-${clientId}.${ext}`;
      const filePath = path.join(CLIENTS_DIR, filename);
      const file = fs.createWriteStream(filePath);

      https.get(logoData, (response) => {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve(`/assets/img/clients/${filename}`);
        });
      }).on('error', (e) => {
        fs.unlink(filePath, () => {});
        reject(e);
      });
      return;
    }

    // If it's a data URL, decode and save
    if (logoData && logoData.startsWith('data:')) {
      const match = logoData.match(/^data:image\/([\w+]+);base64,(.+)$/);
      if (!match) return reject(new Error('Invalid data URL'));

      let ext = match[1].replace('+xml', ''); // svg+xml -> svg
      ext = ext === 'jpeg' ? 'jpg' : ext;
      const filename = `client-${clientId}.${ext}`;
      const filePath = path.join(CLIENTS_DIR, filename);
      const buffer = Buffer.from(match[2], 'base64');

      fs.writeFile(filePath, buffer, (err) => {
        if (err) return reject(err);
        resolve(`/assets/img/clients/${filename}`);
      });
      return;
    }

    resolve(logoData || '');
  });
}

function handleClientsLocal(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const id = url.searchParams.get('id');

  if (req.method === 'GET') {
    supabaseRequest('clients', 'GET')
      .then(data => {
        const filtered = Array.isArray(data) ? data.filter(c => c.active !== false) : data;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(filtered));
      })
      .catch(e => {
        res.writeHead(500);
        res.end(JSON.stringify({ error: e.message }));
      });
  } else if (req.method === 'POST') {
    let body = [];
    req.on('data', chunk => body.push(chunk));
    req.on('end', async () => {
      try {
        const data = JSON.parse(Buffer.concat(body).toString());
        // Generate a temp ID for filename
        const tempId = Date.now().toString(36);
        // Save logo to file if present
        if (data.logo_url) {
          data.logo_url = await saveLogoFile(data.logo_url, tempId);
        }
        const result = await supabaseRequest('clients', 'POST', data);
        const client = Array.isArray(result) ? result[0] : result;
        // If we saved with temp ID, rename to actual ID
        if (client.id && data.logo_url && data.logo_url.includes(tempId)) {
          const oldPath = path.join(__dirname, data.logo_url);
          const newPath = path.join(CLIENTS_DIR, `client-${client.id}${path.extname(oldPath)}`);
          if (fs.existsSync(oldPath)) {
            fs.renameSync(oldPath, newPath);
            data.logo_url = `/assets/img/clients/client-${client.id}${path.extname(oldPath)}`;
            await supabaseRequest('clients', 'PATCH', { logo_url: data.logo_url }, client.id);
            client.logo_url = data.logo_url;
          }
        }
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(client));
      } catch(e) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: e.message }));
      }
    });
  } else if (req.method === 'PUT') {
    let body = [];
    req.on('data', chunk => body.push(chunk));
    req.on('end', async () => {
      try {
        const data = JSON.parse(Buffer.concat(body).toString());
        const updateId = data.id;
        delete data.id;
        // Save logo to file if present
        if (data.logo_url) {
          data.logo_url = await saveLogoFile(data.logo_url, updateId);
        }
        const result = await supabaseRequest('clients', 'PATCH', data, updateId);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(Array.isArray(result) ? result[0] : result));
      } catch(e) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: e.message }));
      }
    });
  } else if (req.method === 'DELETE') {
    const deleteId = url.searchParams.get('id');
    // Try to delete the logo file
    supabaseRequest('clients', 'GET')
      .then(data => {
        const client = (Array.isArray(data) || []).find(c => c.id === deleteId);
        if (client && client.logo_url && client.logo_url.startsWith('/assets/img/clients/')) {
          const filePath = path.join(__dirname, client.logo_url);
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }
        return supabaseRequest('clients', 'DELETE', null, deleteId);
      })
      .then(() => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      })
      .catch(e => {
        res.writeHead(500);
        res.end(JSON.stringify({ error: e.message }));
      });
  } else {
    res.writeHead(405);
    res.end(JSON.stringify({ error: 'Method not allowed' }));
  }
}

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // API requests
  if (req.url.startsWith('/api/')) {
    const pathname = new URL(req.url, `http://localhost:${PORT}`).pathname;

    // Handle locally if not deployed yet
    if (LOCAL_ENDPOINTS.includes(pathname)) {
      return handleClientsLocal(req, res);
    }

    // Proxy to Vercel
    let body = [];
    req.on('data', chunk => body.push(chunk));
    req.on('end', () => {
      const bodyStr = Buffer.concat(body).toString();
      const url = new URL(req.url, VERCEL_URL);

      const options = {
        hostname: 'soportemax.vercel.app',
        port: 443,
        path: url.pathname + url.search,
        method: req.method,
        headers: {
          'Content-Type': req.headers['content-type'] || 'application/json',
          'Authorization': req.headers['authorization'] || ''
        }
      };

      const proxyReq = https.request(options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
      });

      proxyReq.on('error', (e) => {
        console.error('Proxy error:', e.message);
        if (!res.headersSent) {
          res.writeHead(502);
          res.end(JSON.stringify({ error: 'Backend unavailable' }));
        }
      });

      proxyReq.setTimeout(10000, () => {
        proxyReq.destroy();
        if (!res.headersSent) {
          res.writeHead(504);
          res.end(JSON.stringify({ error: 'Gateway timeout' }));
        }
      });

      if (bodyStr) proxyReq.write(bodyStr);
      proxyReq.end();
    });
    return;
  }

  // Static files
  let filePath = req.url === '/' ? '/index.html' : req.url;
  filePath = path.join(__dirname, filePath.split('?')[0]);

  // If directory, serve index.html
  try {
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
  } catch(e) {}

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404);
        res.end('Not found');
      } else {
        res.writeHead(500);
        res.end('Server error');
      }
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`\n  Server running at http://localhost:${PORT}\n`);
  console.log(`  Landing:  http://localhost:${PORT}/`);
  console.log(`  Admin:    http://localhost:${PORT}/admin`);
  console.log(`  Local API: /api/clients (Supabase + local files)\n`);
});
