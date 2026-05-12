// src/index.js
// ─────────────────────────────────────────────────────────
//  CanchaYa API - Servidor principal
// ─────────────────────────────────────────────────────────
require("dotenv").config();

const express    = require("express");
const cors       = require("cors");
const helmet     = require("helmet");
const rateLimit  = require("express-rate-limit");

const canchasRouter  = require("./routes/canchas");
const reservasRouter = require("./routes/reservas");
const equiposRouter  = require("./routes/equipos");
const adminRouter    = require("./routes/admin");

const app  = express();
const PORT = process.env.PORT ?? 3001;

// ── Seguridad ────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === "production"
    ? ["https://tu-dominio.com"]     // ← cambia a tu dominio en producción
    : "*",
  methods: ["GET", "POST", "PATCH", "DELETE"],
}));

// ── Rate limiting ────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100,
  message: { ok: false, error: "Demasiadas solicitudes, intenta más tarde" },
});
app.use("/api/", limiter);

// ── Body parser ──────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Logging básico ───────────────────────────────────────
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ── Rutas ────────────────────────────────────────────────
app.get("/", (_req, res) => res.json({ ok: true, mensaje: "CanchaYa API funcionando 🏟" }));
app.use("/api/canchas",  canchasRouter);
app.use("/api/reservas", reservasRouter);
app.use("/api/equipos",  equiposRouter);
app.use("/api/admin",    adminRouter);

// ── 404 ──────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ ok: false, error: "Ruta no encontrada" }));

// ── Error handler ────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error("[Error]", err.message);
  res.status(500).json({ ok: false, error: "Error interno del servidor" });
});

// ── Arrancar ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🏟  CanchaYa API corriendo en http://localhost:${PORT}`);
  console.log(`📋  Endpoints:`);
  console.log(`    GET  /api/canchas`);
  console.log(`    GET  /api/canchas/:id/disponibilidad?fecha=YYYY-MM-DD`);
  console.log(`    POST /api/reservas`);
  console.log(`    GET  /api/reservas`);
  console.log(`    POST /api/equipos/registro`);
  console.log(`    GET  /api/equipos/buscar`);
  console.log(`    POST /api/equipos/retar`);
  console.log(`    GET  /api/admin/dashboard\n`);
});
