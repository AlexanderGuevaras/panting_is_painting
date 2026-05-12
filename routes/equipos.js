// src/routes/equipos.js
const express  = require("express");
const router   = express.Router();
const supabase = require("../config/supabase");
const { notificarNuevoEquipo, enviarReto } = require("../services/whatsapp");
const { validarCampos } = require("../middleware/validar");

// POST /api/equipos/registro
// Registrar un nuevo equipo
router.post(
  "/registro",
  validarCampos(["nombre", "whatsapp", "modalidad", "nivel", "ciudad"]),
  async (req, res) => {
    const { nombre, capitan, whatsapp, modalidad, nivel, ciudad, dias_disponibles } = req.body;

    // Verificar que no exista ya
    const { count } = await supabase
      .from("equipos")
      .select("id", { count: "exact", head: true })
      .eq("whatsapp", whatsapp);

    if (count > 0) {
      return res.status(409).json({ ok: false, error: "Ya existe un equipo con ese número de WhatsApp" });
    }

    const { data: equipo, error } = await supabase
      .from("equipos")
      .insert({
        nombre,
        capitan: capitan ?? null,
        whatsapp,
        modalidad,
        nivel,
        ciudad,
        dias_disponibles: dias_disponibles ?? [],
        activo: true,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ ok: false, error: error.message });

    // Notificar al negocio
    notificarNuevoEquipo(equipo).catch((e) => console.error("[WA Error]", e.message));

    res.status(201).json({ ok: true, equipo });
  }
);

// GET /api/equipos/buscar?modalidad=futbol7&nivel=Recreativo&dia=Lunes&ciudad=Villavicencio
// Buscar equipos rivales compatibles
router.get("/buscar", async (req, res) => {
  const { modalidad, nivel, dia, ciudad } = req.query;

  let query = supabase
    .from("equipos")
    .select("id, nombre, capitan, modalidad, nivel, ciudad, dias_disponibles, partidos_jugados, creado_en")
    .eq("activo", true)
    .order("partidos_jugados", { ascending: false });

  if (modalidad) query = query.eq("modalidad", modalidad);
  if (ciudad)    query = query.ilike("ciudad", `%${ciudad}%`);

  // Nivel: si no se pasa o es "Libre", no filtra
  if (nivel && nivel !== "Libre") query = query.eq("nivel", nivel);

  const { data, error } = await query;
  if (error) return res.status(500).json({ ok: false, error: error.message });

  // Filtrar por día disponible en JS (array contains)
  let equipos = data ?? [];
  if (dia) {
    equipos = equipos.filter((e) =>
      Array.isArray(e.dias_disponibles) && e.dias_disponibles.includes(dia)
    );
  }

  // Nunca devolver el whatsapp en la lista pública (privacidad)
  res.json({ ok: true, total: equipos.length, equipos });
});

// POST /api/equipos/retar
// Enviar reto a un equipo rival por WhatsApp
router.post(
  "/retar",
  validarCampos(["equipo_retador_id", "equipo_rival_id", "modalidad", "dia"]),
  async (req, res) => {
    const { equipo_retador_id, equipo_rival_id, modalidad, dia, cancha } = req.body;

    // Traer ambos equipos
    const [{ data: retador }, { data: rival }] = await Promise.all([
      supabase.from("equipos").select("nombre, whatsapp").eq("id", equipo_retador_id).single(),
      supabase.from("equipos").select("nombre, whatsapp").eq("id", equipo_rival_id).single(),
    ]);

    if (!retador || !rival) {
      return res.status(404).json({ ok: false, error: "Equipo no encontrado" });
    }

    // Registrar el reto en BD
    const { data: reto, error } = await supabase
      .from("retos")
      .insert({
        equipo_retador_id,
        equipo_rival_id,
        modalidad,
        dia,
        cancha: cancha ?? null,
        estado: "enviado",
      })
      .select()
      .single();

    if (error) return res.status(500).json({ ok: false, error: error.message });

    // Enviar WhatsApp al rival
    await enviarReto({
      retador: retador.nombre,
      rival: rival.nombre,
      whatsapp_rival: rival.whatsapp,
      modalidad,
      dia,
      cancha,
    });

    res.status(201).json({ ok: true, reto });
  }
);

// GET /api/equipos
// Lista todos los equipos (admin)
router.get("/", async (req, res) => {
  const { data, error } = await supabase
    .from("equipos")
    .select("*")
    .order("creado_en", { ascending: false });

  if (error) return res.status(500).json({ ok: false, error: error.message });
  res.json({ ok: true, equipos: data });
});

module.exports = router;
