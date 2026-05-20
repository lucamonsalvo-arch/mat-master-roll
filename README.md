# Mat Master Roll 🥋

Sistema de gestión para academias de Jiu Jitsu.

**Stack:** React + Vite + Tailwind · Node.js + Express · Supabase · MercadoPago · n8n

---

## Estructura

```
mat-master-roll/
├── frontend/        React + Vite + Tailwind
├── backend/         Node.js + Express
└── database/        schema.sql para Supabase
```

---

## 1. Configurar Supabase

1. Crear proyecto en [supabase.com](https://supabase.com)
2. Ir a **SQL Editor** y ejecutar `database/schema.sql`
3. Copiar **Project URL** y **service_role key** (Settings → API)

---

## 2. Configurar MercadoPago

1. Crear app en [developers.mercadopago.com](https://developers.mercadopago.com)
2. Copiar **Access Token** (producción o sandbox) y **Public Key**
3. Configurar webhook en MP apuntando a `https://TU-BACKEND/api/payments/webhook`

---

## 3. Configurar n8n (WhatsApp)

1. Crear workflow en n8n con un nodo **Webhook** (POST)
2. Conectar a **WhatsApp Business API** o **WaAPI / UltraMsg**
3. Lógica:
   - Si `event === "payment_approved"` → mensaje de confirmación al alumno
   - Si `event === "payment_reminder"` → mensaje de recordatorio al deudor
4. Copiar URL del webhook → `N8N_WEBHOOK_URL`

---

## 4. Variables de entorno

### Backend (`backend/.env`)
```env
PORT=3001
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
JWT_SECRET=cadena-larga-aleatoria
MP_ACCESS_TOKEN=APP_USR-xxx
MP_PUBLIC_KEY=APP_USR-xxx
FRONTEND_URL=https://tu-frontend.vercel.app
N8N_WEBHOOK_URL=https://n8n.tudominio.com/webhook/matmasterroll
BACKEND_URL=https://tu-backend.railway.app
```

### Frontend (`frontend/.env`)
```env
VITE_API_URL=https://tu-backend.railway.app
VITE_MP_PUBLIC_KEY=APP_USR-xxx
```

---

## 5. Desarrollo local

```bash
# Backend
cd backend
npm install
cp .env.example .env   # completar variables
npm run dev            # :3001

# Frontend (nueva terminal)
cd frontend
npm install
cp .env.example .env   # completar variables
npm run dev            # :5173

# Seed (datos de prueba)
cd backend
npm run seed
```

Usuarios de prueba (PIN: `1234`):
| DNI | Nombre | Rol |
|-----|--------|-----|
| 00000001 | Profesor Admin | profesor |
| 12345678 | Juan Pérez | alumno |
| 87654321 | María González | alumno |

---

## 6. Deploy en Railway (Backend)

1. Crear cuenta en [railway.app](https://railway.app)
2. **New Project → Deploy from GitHub repo**
3. Seleccionar el repo, configurar **Root Directory**: `backend`
4. En **Variables** agregar todas las del `.env`
5. Railway detecta automáticamente Node.js y usa `npm start`
6. Copiar la URL generada → usarla en `BACKEND_URL` y en el frontend

---

## 7. Deploy en Vercel (Frontend)

```bash
# Instalar CLI
npm i -g vercel

cd frontend
vercel

# Configurar en vercel.com:
# - Framework: Vite
# - Root Directory: frontend
# - Environment Variables: VITE_API_URL, VITE_MP_PUBLIC_KEY
```

O via dashboard de Vercel:
1. Import Git Repository
2. **Framework Preset**: Vite
3. **Root Directory**: `frontend`
4. Agregar variables de entorno
5. Deploy

---

## Funcionalidades

### Panel Profesor
| Sección | Descripción |
|---------|-------------|
| **Alumnos** | Alta, edición, búsqueda. Belt + rayitas |
| **Clases** | Marcar asistencia por clase y fecha. Toggle individual y masivo |
| **Horarios** | Vista lista + cronograma semanal. CRUD de horarios |
| **Finanzas** | Resumen mensual, deudores, registro manual de pagos |
| **Accesos** | Log de ingresos al sistema |

### Panel Alumno
| Sección | Descripción |
|---------|-------------|
| **Dashboard** | Asistencia del mes, estado de cuota, historial de pagos |
| **Mis horarios** | Clases inscriptas con día/horario/lugar |
| **Mi perfil** | Editar teléfono y email |
| **Pagar cuota** | Checkout Pro de MercadoPago |

### Notificaciones WhatsApp (n8n)
- **Pago aprobado** → mensaje automático al alumno
- **Recordatorio deudores** → botón en Finanzas envía a todos los que no pagaron

---

## Tipos de clase disponibles
- BJJ · NoGi · BJJ Adolescentes · BJJ Femenino
- BJJ Mixto · BJJ Infantil A · BJJ Infantil B · Entrenamiento Personalizado

---

## Seguridad
- PIN hasheado con bcrypt (10 rounds)
- JWT con expiración configurable
- Rate limiting en todas las rutas (20 req/15min en login)
- Roles validados en cada endpoint
- RLS desactivado (backend usa service role key, no client key)
