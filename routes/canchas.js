// src/routes/canchas.js
const express = require("express");
const router  = express.Router();
const supabase = require("../config/supabase");
const { calcularPrecio, calcularOcupacion } = require("../services/precios");

const HORARIOS = [7,8,9,10,11,12,13,14,15,16,17,18,19,20,21];

// GET /api/canchas
// Lista todas las canchas activas
router.get("/", async (req, res) => {
  const { data, error } = await supabase
    .from("canchas")
    .select("*")
    .eq("activa", true)
    .order("nombre");

  if (error) return res.status(500).json({ ok: false, error: error.message });
  res.json({ ok: true, canchas: data });
});

// GET /api/canchas/:id/disponibilidad?fecha=YYYY-MM-DD
// Retorna todos los horarios de una cancha con precio dinámico
router.get("/:id/disponibilidad", async (req, res) => {
  const { id } = req.params;
  const fecha = req.query.fecha ?? new Date().toISOString().slice(0, 10);

  // Traer la cancha
  const { data: cancha, error: errCancha } = await supabase
    .from("canchas")
    .select("*")
    .eq("id", id)
    .single();

  if (errCancha || !cancha) return res.status(404).json({ ok: false, error: "Cancha no encontrada" });

  // Reservas ya existentes en esa fecha
  const { data: reservas } = await supabase
    .from("reservas")
    .select("hora")
    .eq("cancha_id", id)
    .eq("fecha", fecha)
    .in("estado", ["confirmada", "pendiente"]);

  const horasOcupadas = new Set((reservas ?? []).map((r) => r.hora));

  // Ocupación global del día (para precio dinámico)
  const ocupacion = await calcularOcupacion(id, fecha, supabase);

  const turnos = HORARIOS.map((hora) => {
    const ocupado = horasOcupadas.has(hora);
    if (ocupado) return { hora, disponible: false };

    const { precio, precioBase, descuento, etiqueta } = calcularPrecio(cancha.tipo, ocupacion);
    return { hora, disponible: true, precio, precioBase, descuento, etiqueta, ocupacion: Math.round(ocupacion * 100) };
  });

  res.json({ ok: true, cancha, fecha, ocupacion: Math.round(ocupacion * 100), turnos });
});

module.exports = router;
