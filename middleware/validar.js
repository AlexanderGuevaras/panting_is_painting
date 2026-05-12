// src/middleware/validar.js
// ─────────────────────────────────────────────────────────
//  Funciones de validación de request bodies
// ─────────────────────────────────────────────────────────

function validarCampos(campos) {
  return (req, res, next) => {
    const faltantes = campos.filter((c) => {
      const val = req.body[c];
      return val === undefined || val === null || val === "";
    });
    if (faltantes.length > 0) {
      return res.status(400).json({
        ok: false,
        error: `Campos requeridos faltantes: ${faltantes.join(", ")}`,
      });
    }
    next();
  };
}

function validarFecha(req, res, next) {
  const { fecha } = req.body.fecha ? req.body : req.query;
  if (fecha && !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return res.status(400).json({ ok: false, error: "Formato de fecha inválido. Usar YYYY-MM-DD" });
  }
  next();
}

function validarHora(req, res, next) {
  const hora = req.body.hora ?? req.query.hora;
  const h = parseInt(hora);
  if (isNaN(h) || h < 7 || h > 21) {
    return res.status(400).json({ ok: false, error: "Hora inválida. Rango permitido: 7–21" });
  }
  next();
}

module.exports = { validarCampos, validarFecha, validarHora };
