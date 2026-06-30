const crypto = require('crypto');
const SECRET = process.env.JWT_SECRET || 'soportemax-secret-key-change-in-production';

function verifyToken(token) {
  try {
    const [payloadB64, sig] = token.split('.');
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString());
    const expected = crypto.createHash('sha256').update(JSON.stringify(payload) + SECRET).digest('hex');
    if (sig !== expected || Date.now() > payload.exp) return null;
    return payload;
  } catch { return null; }
}

function authMiddleware(req) {
  const auth = req.headers.authorization || '';
  const token = auth.replace('Bearer ', '');
  if (!token) return null;
  return verifyToken(token);
}

module.exports = { verifyToken, authMiddleware };
