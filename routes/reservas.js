// src/routes/reservas.js
const express  = require("express");
const router   = express.Router();
const supabase = require("../config/supabase");
const { calcularPrecio, calcularOcupacion } = require("../services/precios");
const { notificarReserva } = require("../services/whatsapp");
const { validarCampos }    = require("../middleware/validar");

// POST /api/reservas
// Crea una nueva reserva y notifica por WhatsApp
router.post(
  "/",
  validarCampos(["cancha_id", "fecha", "hora", "nombre_cliente", "whatsapp_cliente"]),
  async (req, res) => {
    const { cancha_id, fecha, hora, nombre_cliente, whatsapp_cliente, equipo_id } = req.body;

    // 1. Verificar que la cancha exista
    const { data: cancha, error: errCancha } = await supabase
      .from("canchas")
      .select("*")
      .eq("id", cancha_id)
      .single();

    if (errCancha || !cancha) {
      return res.status(404).json({ ok: false, error: "Cancha no encontrada" });
    }

    // 2. Verificar que el turno esté libre
    const { count } = await supabase
      .from("reservas")
      .select("id", { count: "exact", head: true })
      .eq("cancha_id", cancha_id)
      .eq("fecha", fecha)
      .eq("hora", hora)
      .in("estado", ["confirmada", "pendiente"]);

    if (count > 0) {
      return res.status(409).json({ ok: false, error: "Ese turno ya está reservado" });
    }

    // 3. Calcular precio dinámico en tiempo real
    const ocupacion = await calcularOcupacion(cancha_id, fecha, supabase);
    const { precio, precioBase, descuento, etiqueta } = calcularPrecio(cancha.tipo, ocupacion);

    // 4. Insertar reserva
    const { data: reserva, error: errReserva } = await supabase
      .from("reservas")
      .insert({
        cancha_id,
        fecha,
        hora: parseInt(hora),
        nombre_cliente,
        whatsapp_cliente,
        equipo_id: equipo_id ?? null,
        precio,
        precio_base: precioBase,
        descuento,
        etiqueta_precio: etiqueta,
        estado: "pendiente",
      })
      .select()
      .single();

    if (errReserva) {
      return res.status(500).json({ ok: false, error: errReserva.message });
    }

    // 5. Notificar por WhatsApp (sin bloquear la respuesta)
    notificarReserva({
      equipo: nombre_cliente,
      cancha: cancha.nombre,
      fecha,
      hora,
      precio,
      estado: "pendiente",
      whatsapp_cliente,
    }).catch((e) => console.error("[WA Error]", e.message));

    res.status(201).json({ ok: true, reserva, precio, descuento, etiqueta });
  }
);

// GET /api/reservas?fecha=YYYY-MM-DD&cancha_id=X
// Lista reservas (para panel admin)
router.get("/", async (req, res) => {
  const { fecha, cancha_id, estado } = req.query;

  let query = supabase
    .from("reservas")
    .select("*, canchas(nombre, tipo)")
    .order("fecha", { ascending: true })
    .order("hora", { ascending: true });

  if (fecha)     query = query.eq("fecha", fecha);
  if (cancha_id) query = query.eq("cancha_id", cancha_id);
  if (estado)    query = query.eq("estado", estado);

  const { data, error } = await query;
  if (error) return res.status(500).json({ ok: false, error: error.message });

  res.json({ ok: true, reservas: data });
});

// PATCH /api/reservas/:id/estado
// Confirmar o cancelar una reserva
router.patch("/:id/estado", validarCampos(["estado"]), async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;

  const estadosValidos = ["confirmada", "cancelada", "pendiente"];
  if (!estadosValidos.includes(estado)) {
    return res.status(400).json({ ok: false, error: `Estado inválido. Opciones: ${estadosValidos.join(", ")}` });
  }

  const { data: reserva, error } = await supabase
    .from("reservas")
    .update({ estado, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*, canchas(nombre)")
    .single();

  if (error) return res.status(500).json({ ok: false, error: error.message });

  // Notificar al cliente si se confirma
  if (estado === "confirmada") {
    notificarReserva({
      equipo: reserva.nombre_cliente,
      cancha: reserva.canchas.nombre,
      fecha: reserva.fecha,
      hora: reserva.hora,
      precio: reserva.precio,
      estado: "confirmada",
      whatsapp_cliente: reserva.whatsapp_cliente,
    }).catch((e) => console.error("[WA Error]", e.message));
  }

  res.json({ ok: true, reserva });
});

module.exports = router;
