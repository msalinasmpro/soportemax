# Guía Completa — Proyecto Isinet Soluciones Informáticas

## Datos del Proyecto

| Dato | Valor |
|------|-------|
| Empresa | Isinet Soluciones Informáticas |
| URL Landing | https://soportemax.vercel.app |
| URL Admin | https://soportemax.vercel.app/admin |
| GitHub | https://github.com/msalinasmpro/soportemax |
| Vercel | https://vercel.com/msalinas-org/soportemax |
| Supabase | txjglqkttidhhobovzzz |
| Email admin | admin@isinet.cl |
| Password admin | Isinet2026! |

---

## Estructura del Proyecto

```
webapp/
├── index.html              ← Landing page principal
├── styles.css              ← CSS premium (Satoshi + Space Grotesk)
├── main.js                 ← JavaScript vanilla (IIFE)
├── video-test.html         ← Preview de opciones de video
├── admin/
│   ├── index.html          ← Login (inline JS)
│   ├── dashboard.html      ← Panel admin (inline JS)
│   ├── dashboard.css       ← Estilos admin
│   └── dashboard.js        ← Lógica admin (referencia)
├── api/
│   ├── auth/login.js       ← Login JWT
│   ├── config.js           ← CRUD configuración
│   ├── upload.js           ← Upload imágenes
│   ├── update-config.js    ← Guardar config
│   ├── images.js           ← Estado de imágenes
│   └── img.js              ← Endpoint de imágenes
├── lib/
│   ├── gsap.min.js         ← GSAP 3.12
│   ├── ScrollTrigger.min.js
│   └── manifest.js         ← Datos globales
├── assets/img/             ← Imágenes del proyecto
├── supabase/
│   ├── schema.sql          ← Schema completo
│   └── setup.sql           ← Script de setup
├── vercel.json             ← Config Vercel
└── .htaccess               ← Cache control
```

---

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | HTML5 + CSS3 + JavaScript vanilla |
| Estilos | CSS custom properties, Satoshi + Space Grotesk |
| Animaciones | GSAP + ScrollTrigger |
| Backend | Vercel Serverless Functions |
| Base de datos | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Storage | Supabase Storage |
| Deploy | Vercel (auto-deploy desde GitHub) |
| Repo | GitHub |

---

## Paleta de Colores

```css
--bg: #0a0a0f;          /* Dark navy */
--surface: #0e0e14;
--accent: #4A90D9;       /* Desaturated blue */
--accent-2: #5BC0BE;     /* Teal */
--text: #ffffff;
--text-3: #a0a0a0;
```

---

## Cómo Cambiar Contenido

### Textos
1. Admin → **Textos**
2. Edita cualquier campo
3. Presiona **Guardar**

### Imágenes
1. Admin → **Imágenes**
2. Click en la imagen que quieres cambiar
3. Selecciona archivo o pega URL de Google Drive
4. Presiona **Guardar**

### Video Hero
1. Admin → **Datos Empresa**
2. Pega link de Google Drive en "Video del Hero"
3. Guardar
4. El video se recorta automáticamente a 7s con loop

### Logo
1. Admin → **Logo**
2. Sube imagen PNG/SVG
3. Guardar

### Servicios
1. Admin → **Servicios**
2. Editar, agregar o eliminar servicios
3. Guardar

### Mapa
1. Admin → **Mapa**
2. Escribe la dirección
3. Click "Buscar"
4. Guardar

---

## Cómo Subir Imágenes desde Google Drive

1. Sube imagen/video a Google Drive
2. Click derecho → Compartir → Copiar enlace
3. En el admin → pega el link donde necesites
4. El sistema convierte automáticamente el link

**Formato aceptado:**
- `https://drive.google.com/file/d/ID/view`
- `https://drive.google.com/file/d/ID/view?usp=sharing`

---

## Cómo Cambiar el Video del Hero

1. Sube video a Google Drive (máx 7 segundos recomendado)
2. Admin → Datos Empresa → Video del Hero
3. Pega el link
4. Guardar

**El video:**
- Se recorta automáticamente a 7 segundos
- Se reproduce en loop infinito
- Se muestra muted (requerido para autoplay)
- Se almacena en Supabase Storage

---

## Endpoints de API

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/auth/login` | POST | Login JWT |
| `/api/config` | GET/PUT | Configuración del sitio |
| `/api/upload` | POST | Subir imagen a Supabase |
| `/api/update-config` | POST | Guardar config |
| `/api/images` | GET/PUT | Estado de imágenes |
| `/api/img?f=filename` | GET | Servir imagen con reemplazo |
| `/api/services` | GET/POST/PUT/DELETE | CRUD servicios |
| `/api/testimonials` | GET/POST/PUT/DELETE | CRUD testimonios |
| `/api/faqs` | GET/POST/PUT/DELETE | CRUD FAQ |
| `/api/contact` | GET/POST | Mensajes contacto |

---

## Variables de Entorno (Vercel)

```
SUPABASE_URL=https://txjglqkttidhhobovzzz.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_KEY=sb_secret_...
```

---

## Comandos Útiles

```bash
# Deploy
git push origin main

# Verificar deploy
curl -s -o /dev/null -w '%{http_code}' https://soportemax.vercel.app/

# Test API
curl -s https://soportemax.vercel.app/api/config | python3 -m json.tool

# Login test
curl -s -X POST https://soportemax.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@isinet.cl","password":"Isinet2026!"}'
```

---

## Notas Importantes

- **No usar Supabase Free tier** si ya tienes uno lleno — crea uno nuevo
- **Imágenes**: usar `assets/img/` directo, no `/api/img?f=` (redirects no confiables)
- **Google Drive**: los links de compartir se convierten automáticamente
- **Video hero**: máximo 7 segundos, loop automático, muted
- **localStorage**: se usa como respaldo para config (sobrevive deploys de Vercel)
- **Admin panel**: JavaScript inline (no depende de archivos externos)
