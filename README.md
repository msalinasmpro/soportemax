# SoporteMax — Soporte Técnico Profesional

Página web corporativa premium para empresa de soporte técnico informático.

## Tecnologías

- **Frontend:** HTML5 + CSS3 + JavaScript vanilla (IIFE pattern)
- **Animaciones:** GSAP + ScrollTrigger
- **Backend:** Supabase (Auth + Database + Storage)
- **Deploy:** Vercel
- **Repo:** GitHub

## Estructura

```
├── index.html          # Landing page principal
├── styles.css          # Estilos globales
├── main.js             # Lógica principal
├── admin/              # Panel administrador
│   ├── index.html      # Login
│   ├── dashboard.html  # Dashboard
│   ├── login.css/js    # Estilos/login lógica
│   └── dashboard.css/js # Estilos/dashboard lógica
├── lib/                # GSAP, ScrollTrigger, manifest
├── assets/             # Imágenes, créditos
├── supabase/           # Schema SQL
└── vercel.json         # Configuración Vercel
```

## Setup

### 1. Supabase

1. Crear proyecto en [supabase.com](https://supabase.com)
2. Ir a SQL Editor y ejecutar `supabase/schema.sql`
3. Ir a Storage → Crear bucket `site-images` (público)
4. Copiar URL y anon key

### 2. Variables de entorno

Crear archivo `.env` o configurar en Vercel:

```
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu-anon-key
```

Actualizar en `admin/dashboard.js` las variables `SUPABASE_URL` y `SUPABASE_KEY`.

### 3. Deploy en Vercel

1. Subir a GitHub
2. Conectar repo en [vercel.com](https://vercel.com)
3. Deploy automático

### 4. Admin

- URL: `/admin`
- Demo: `admin@example.com` / `admin123`
- Para producción: crear usuario en Supabase Dashboard → Authentication

## Local Development

```bash
python3 -m http.server 8765
# Abrir http://localhost:8765
```

## License

Proyecto privado. SoporteMax © 2026.
