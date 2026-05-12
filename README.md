# CanchaYa · Backend API

Backend REST para la app de canchas sintéticas. Construido con **Node.js + Express + Supabase**.

---

## Stack

| Capa | Tecnología |
|---|---|
| Servidor | Node.js + Express |
| Base de datos | Supabase (PostgreSQL) |
| Mensajería | Twilio WhatsApp API |
| Hosting recomendado | Railway / Render (gratis) |

---

## Estructura del proyecto

```
canchaYa-backend/
├── src/
│   ├── index.js              ← Servidor principal
│   ├── config/
│   │   └── supabase.js       ← Cliente Supabase
│   ├── routes/
│   │   ├── canchas.js        ← GET /api/canchas, disponibilidad
│   │   ├── reservas.js       ← POST/GET/PATCH /api/reservas
│   │   ├── equipos.js        ← Registro, búsqueda, retos
│   │   └── admin.js          ← Dashboard, ingresos
│   ├── services/
│   │   ├── precios.js        ← Lógica de precios dinámicos
│   │   └── whatsapp.js       ← Envío de mensajes Twilio
│   └── middleware/
│       └── validar.js        ← Validación de campos
└── supabase/
    └── schema.sql            ← Tablas y políticas de seguridad
```

---

## Configuración paso a paso

### 1. Crear proyecto en Supabase

1. Ir a [supabase.com](https://supabase.com) → **New project**
2. Copiar la `URL` y el `service_role key` desde **Settings → API**
3. Abrir **SQL Editor** y ejecutar todo el contenido de `supabase/schema.sql`

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Editar `.env` con tus datos reales.

### 3. Instalar dependencias

```bash
npm install
```

### 4. Correr en desarrollo

```bash
npm run dev
```

El servidor inicia en `http://localhost:3001`

---

## Endpoints

### Canchas

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/canchas` | Lista todas las canchas activas |
| GET | `/api/canchas/:id/disponibilidad?fecha=YYYY-MM-DD` | Horarios con precio dinámico |

### Reservas

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/reservas` | Crear reserva + notificar WhatsApp |
| GET | `/api/reservas?fecha=&cancha_id=` | Listar reservas |
| PATCH | `/api/reservas/:id/estado` | Confirmar o cancelar |

**Body para crear reserva:**
```json
{
  "cancha_id": "uuid-de-la-cancha",
  "fecha": "2025-05-15",
  "hora": 18,
  "nombre_cliente": "Carlos Pérez",
  "whatsapp_cliente": "3001234567"
}
```

### Equipos

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/equipos/registro` | Registrar equipo |
| GET | `/api/equipos/buscar?modalidad=&nivel=&dia=` | Buscar rivales |
| POST | `/api/equipos/retar` | Enviar reto por WhatsApp |

**Body para registrar equipo:**
```json
{
  "nombre": "Los Guerreros FC",
  "capitan": "Juan García",
  "whatsapp": "3007654321",
  "modalidad": "futbol7",
  "nivel": "Recreativo",
  "ciudad": "Villavicencio",
  "dias_disponibles": ["Lunes", "Viernes", "Sábado"]
}
```

### Admin

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/admin/dashboard` | Resumen del negocio |
| GET | `/api/admin/ingresos?desde=&hasta=` | Ingresos por rango |

---

## Precios dinámicos

| Ocupación del día | Factor | Resultado |
|---|---|---|
| 0 – 30% | 0.65 | **−35%** descuento |
| 31 – 50% | 0.85 | −15% descuento |
| 51 – 75% | 1.00 | Precio normal |
| 76 – 90% | 1.20 | +20% precio pico |
| 91 – 100% | 1.25 | +25% precio pico máximo |

---

## Despliegue en producción (Railway)

1. Crear cuenta en [railway.app](https://railway.app)
2. **New Project → Deploy from GitHub repo**
3. Agregar las variables de entorno en el panel de Railway
4. Railway detecta Node.js automáticamente y despliega

Costo: **gratis** hasta 500 horas/mes.

---

## WhatsApp (Twilio)

1. Crear cuenta en [twilio.com](https://twilio.com)
2. Activar **WhatsApp Sandbox** (para pruebas, gratis)
3. Para producción: solicitar número WhatsApp Business aprobado (~$5/mes)
4. Copiar `Account SID` y `Auth Token` al `.env`

En modo desarrollo (`NODE_ENV=development`) los mensajes se imprimen en consola sin llamar a Twilio.
