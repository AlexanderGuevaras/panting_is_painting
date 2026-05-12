// src/services/precios.js
// ─────────────────────────────────────────────────────────
//  Lógica de precios dinámicos según ocupación
// ─────────────────────────────────────────────────────────

const PRECIO_BASE = {
  "futbol5":  50000,
  "futbol7":  70000,
  "futbol11": 90000,
};

/**
 * Calcula el precio de un turno según la ocupación del día.
 * @param {string} tipo       - "futbol5" | "futbol7" | "futbol11"
 * @param {number} ocupacion  - porcentaje 0.0 → 1.0
 * @returns {{ precio, precioBase, descuento, etiqueta }}
 */
function calcularPrecio(tipo, ocupacion) {
  const base = PRECIO_BASE[tipo] ?? 60000;

  let factor;
  let etiqueta;

  if (ocupacion <= 0.30) {
    // Baja demanda → descuento agresivo para llenar la cancha
    factor = 0.65;
    etiqueta = "oferta";
  } else if (ocupacion <= 0.50) {
    factor = 0.85;
    etiqueta = "descuento";
  } else if (ocupacion <= 0.75) {
    factor = 1.0;
    etiqueta = "normal";
  } else if (ocupacion <= 0.90) {
    factor = 1.20;
    etiqueta = "alta_demanda";
  } else {
    factor = 1.25;
    etiqueta = "pico";
  }

  const precio = Math.round(base * factor);
  const descuento = precio < base ? Math.round((1 - precio / base) * 100) : 0;

  return { precio, precioBase: base, descuento, etiqueta };
}

/**
 * Calcula la ocupación de una cancha en una fecha dada.
 * @param {string} canchaId
 * @param {string} fecha   - "YYYY-MM-DD"
 * @param {object} supabase
 * @returns {number} ocupacion 0.0 → 1.0
 */
async function calcularOcupacion(canchaId, fecha, supabase) {
  const TURNOS_TOTALES = 15; // 7am – 9pm

  const { count, error } = await supabase
    .from("reservas")
    .select("id", { count: "exact", head: true })
    .eq("cancha_id", canchaId)
    .eq("fecha", fecha)
    .in("estado", ["confirmada", "pendiente"]);

  if (error) return 0;
  return Math.min((count ?? 0) / TURNOS_TOTALES, 1);
}

module.exports = { calcularPrecio, calcularOcupacion, PRECIO_BASE };
