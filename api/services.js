const fs = require('fs');
const path = require('path');
const { authMiddleware } = require('./auth/verify');

const DATA_DIR = path.join('/tmp', 'isinet-data');
const FILE = path.join(DATA_DIR, 'services.json');

function ensureDataDir() { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true }); }

function getServices() {
  if (!fs.existsSync(FILE)) {
    const defaults = [
      { id: '1', title: 'Reparación de Computadores', description: 'Diagnóstico y reparación experta de desktops, laptops y workstations.', icon: 'monitor', image_url: 'assets/img/repair-workspace.jpg', sort_order: 1, active: true },
      { id: '2', title: 'Notebook', description: 'Reparación especializada de notebooks: pantallas, teclados, baterías.', icon: 'laptop', image_url: 'assets/img/laptop-repair.jpg', sort_order: 2, active: true },
      { id: '3', title: 'PC Gamer', description: 'Optimización y reparación de PC gaming para máximo rendimiento.', icon: 'gamepad-2', image_url: 'assets/img/gaming-pc.jpg', sort_order: 3, active: true },
      { id: '4', title: 'Soporte Empresas', description: 'Soporte técnico integral con contratos de mantención y SLA.', icon: 'building-2', image_url: 'assets/img/office-tech.jpg', sort_order: 4, active: true },
      { id: '5', title: 'Soporte Remoto', description: 'Resolvemos problemas de forma remota, rápida y segura.', icon: 'wifi', image_url: 'assets/img/hero-glow.jpg', sort_order: 5, active: true },
      { id: '6', title: 'Respaldo de Información', description: 'Copias de seguridad automáticas y recuperación de datos.', icon: 'hard-drive', image_url: 'assets/img/data-backup.jpg', sort_order: 6, active: true },
      { id: '7', title: 'Eliminación de Virus', description: 'Eliminación completa de malware, ransomware y spyware.', icon: 'shield-check', image_url: 'assets/img/services-2.jpg', sort_order: 7, active: true },
      { id: '8', title: 'Optimización', description: 'Optimización de rendimiento: limpieza, updates y configuración.', icon: 'zap', image_url: 'assets/img/technician.jpg', sort_order: 8, active: true },
      { id: '9', title: 'Instalación Windows', description: 'Instalación y configuración de Windows con drivers y updates.', icon: 'download', image_url: 'assets/img/hero-lab.jpg', sort_order: 9, active: true },
      { id: '10', title: 'Redes', description: 'Diseño, cableado estructurado, switches, routers y WiFi.', icon: 'network', image_url: 'assets/img/network-cables.jpg', sort_order: 10, active: true },
      { id: '11', title: 'Servidores', description: 'Configuración y mantención de servidores con monitoreo 24/7.', icon: 'server', image_url: 'assets/img/server-room.jpg', sort_order: 11, active: true },
      { id: '12', title: 'Mantención Preventiva', description: 'Programas de mantención para evitar fallos y auditoría técnica.', icon: 'wrench', image_url: 'assets/img/about-team.jpg', sort_order: 12, active: true }
    ];
    fs.writeFileSync(FILE, JSON.stringify(defaults, null, 2));
    return defaults;
  }
  return JSON.parse(fs.readFileSync(FILE, 'utf8'));
}

function saveServices(data) { fs.writeFileSync(FILE, JSON.stringify(data, null, 2)); }

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  ensureDataDir();

  if (req.method === 'GET') {
    return res.status(200).json(getServices().filter(s => s.active));
  }

  const user = authMiddleware(req);
  if (!user) return res.status(401).json({ error: 'No autorizado' });

  if (req.method === 'POST') {
    const services = getServices();
    const newService = { id: Date.now().toString(), ...req.body, sort_order: services.length + 1, active: true };
    services.push(newService);
    saveServices(services);
    return res.status(201).json(newService);
  }

  if (req.method === 'PUT') {
    const services = getServices();
    const idx = services.findIndex(s => s.id === req.body.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    services[idx] = { ...services[idx], ...req.body };
    saveServices(services);
    return res.status(200).json(services[idx]);
  }

  if (req.method === 'DELETE') {
    const id = req.query.id || req.body?.id;
    let services = getServices();
    services = services.filter(s => s.id !== id);
    saveServices(services);
    return res.status(200).json({ ok: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
};
