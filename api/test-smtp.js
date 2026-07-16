const nodemailer = require('nodemailer');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { host, port, user, pass, to } = req.body || {};
  if (!host || !port || !user || !pass || !to) {
    return res.status(400).json({ error: 'Todos los campos son requeridos' });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: host,
      port: parseInt(port),
      secure: parseInt(port) === 465,
      auth: {
        user: user,
        pass: pass
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    await transporter.sendMail({
      from: user,
      to: to,
      subject: 'Prueba de configuración SMTP — Isinet',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:32px;background:#0a0a0c;border-radius:16px;">
          <div style="text-align:center;margin-bottom:24px;">
            <div style="display:inline-block;width:48px;height:48px;background:linear-gradient(135deg,#06b6d4,#22d3ee);border-radius:12px;line-height:48px;font-size:24px;">⚡</div>
          </div>
          <h1 style="color:#f0f9ff;font-size:20px;text-align:center;margin-bottom:8px;">Configuración SMTP Exitosa</h1>
          <p style="color:#6b8fa8;font-size:14px;text-align:center;margin-bottom:24px;">El servidor de correo está configurado correctamente.</p>
          <div style="background:#111827;border:1px solid rgba(6,182,212,0.18);border-radius:12px;padding:16px;margin-bottom:16px;">
            <p style="color:#e0f2fe;font-size:13px;margin:0;"><strong>Servidor:</strong> ${host}:${port}</p>
            <p style="color:#e0f2fe;font-size:13px;margin:8px 0 0;"><strong>Usuario:</strong> ${user}</p>
          </div>
          <p style="color:#475569;font-size:12px;text-align:center;">Isinet Soluciones Informáticas</p>
        </div>
      `
    });

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('SMTP test error:', error);
    res.status(200).json({ ok: false, error: error.message || 'Error al conectar con el servidor SMTP' });
  }
};
