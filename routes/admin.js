// src/routes/admin.js
const express  = require("express");
const router   = express.Router();
const supabase = require("../config/supabase");

// GET /api/admin/dashboard
// Resumen del negocio para el panel de administración
router.get("/dashboard", async (req, res) => {
  const hoy = new Date().toISOString().slice(0, 10);
  const inicioMes = hoy.slice(0, 7) + "-01";

  const [
    { count: reservasHoy },
    { count: equiposTotal },
    { data: ingresosMes },
    { data: canchasOcupacion },
    { count: retosEnviados },
  ] = await Promise.all([
    supabase
      .from("reservas").select("id", { count: "exact", head: true })
      .eq("fecha", hoy).in("estado", ["confirmada", "pendiente"]),

    supabase
      .from("equipos").select("id", { count: "exact", head: true }).eq("activo", true),

    supabase
      .from("reservas").select("precio, estado")
      .gte("fecha", inicioMes).eq("estado", "confirmada"),

    supabase
      .from("reservas").select("cancha_id, canchas(nombre, tipo), precio, fecha")
      .eq("fecha", hoy).in("estado", ["confirmada", "pendiente"]),

    supabase
      .from("retos").select("id", { count: "exact", head: true })
      .gte("creado_en", inicioMes),
  ]);

  const totalMes = (ingresosMes ?? []).reduce((s, r) => s + (r.precio ?? 0), 0);

  // Agrupar ocupación por cancha
  const porCancha = {};
  (canchasOcupacion ?? []).forEach((r) => {
    const key = r.cancha_id;
    if (!porCancha[key]) {
      porCancha[key] = { nombre: r.canchas?.nombre, tipo: r.canchas?.tipo, reservas: 0, ingreso: 0 };
    }
    porCancha[key].reservas++;
    porCancha[key].ingreso += r.precio ?? 0;
  });

  res.json({
    ok: true,
    resumen: {
      reservas_hoy: reservasHoy ?? 0,
      equipos_registrados: equiposTotal ?? 0,
      ingresos_mes: totalMes,
      retos_mes: retosEnviados ?? 0,
    },
    canchas_hoy: Object.values(porCancha),
  });
});

// GET /api/admin/ingresos?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
// Ingresos por rango de fechas
router.get("/ingresos", async (req, res) => {
  const { desde, hasta } = req.query;

  let query = supabase
    .from("reservas")
    .select("fecha, precio, estado, cancha_id, canchas(nombre)")
    .eq("estado", "confirmada")
    .order("fecha");

  if (desde) query = query.gte("fecha", desde);
  if (hasta) query = query.lte("fecha", hasta);

  const { data, error } = await query;
  if (error) return res.status(500).json({ ok: false, error: error.message });

  // Agrupar por fecha
  const porFecha = {};
  (data ?? []).forEach((r) => {
    porFecha[r.fecha] = (porFecha[r.fecha] ?? 0) + r.precio;
  });

  const serie = Object.entries(porFecha).map(([fecha, total]) => ({ fecha, total }));

  res.json({
    ok: true,
    total: (data ?? []).reduce((s, r) => s + r.precio, 0),
    reservas: data?.length ?? 0,
    serie,
  });
});

module.exports = router;
