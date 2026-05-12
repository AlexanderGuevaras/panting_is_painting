// src/services/whatsapp.js
// ─────────────────────────────────────────────────────────
//  Envío de mensajes WhatsApp via Twilio
// ─────────────────────────────────────────────────────────

const twilio = require("twilio");

let client = null;

function getClient() {
  if (!client) {
    client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
  }
  return client;
}

function formatWA(numero) {
  // Acepta: "3001234567" o "+573001234567" → "whatsapp:+573001234567"
  const limpio = numero.replace(/\D/g, "");
  const con57 = limpio.startsWith("57") ? limpio : `57${limpio}`;
  return `whatsapp:+${con57}`;
}

function formatCOP(n) {
  return `$${Number(n).toLocaleString("es-CO")}`;
}

// ── Plantillas de mensajes ───────────────────────────────

function msgConfirmacionReserva({ equipo, cancha, fecha, hora, precio, estado }) {
  return (
    `✅ *Reserva ${estado === "confirmada" ? "Confirmada" : "Recibida"}*\n\n` +
    `🏟 *${cancha}*\n` +
    `📅 ${fecha}  ⏰ ${hora}:00 hs\n` +
    `💵 Valor: *${formatCOP(precio)}*\n\n` +
    `${estado === "pendiente"
      ? "Tu reserva está pendiente de confirmación. Te avisaremos pronto."
      : "¡Nos vemos en la cancha! Recuerda llegar 10 min antes."
    }\n\n` +
    `_${process.env.NEGOCIO_NOMBRE} · Canchas Sintéticas_`
  );
}

function msgRetoEquipo({ retador, rival, modalidad, dia, cancha }) {
  return (
    `⚽ *¡Reto de partido!*\n\n` +
    `Hola *${rival}*!\n\n` +
    `El equipo *${retador}* te reta a un partido de *${modalidad}* el día *${dia}*` +
    `${cancha ? ` en *${cancha}*` : ""}.\n\n` +
    `¿Aceptan el reto? Respondan este mensaje para coordinar. 🏆\n\n` +
    `_Enviado desde ${process.env.NEGOCIO_NOMBRE}_`
  );
}

function msgNotificacionNegocio({ tipo, datos }) {
  if (tipo === "nueva_reserva") {
    return (
      `🔔 *Nueva reserva*\n\n` +
      `👤 ${datos.nombre_cliente}\n` +
      `📞 ${datos.whatsapp_cliente}\n` +
      `🏟 ${datos.cancha} · ${datos.fecha} ${datos.hora}:00 hs\n` +
      `💵 ${formatCOP(datos.precio)}`
    );
  }
  if (tipo === "nuevo_equipo") {
    return (
      `🆕 *Nuevo equipo registrado*\n\n` +
      `🏅 ${datos.nombre}\n` +
      `👤 Capitán: ${datos.capitan}\n` +
      `📞 ${datos.whatsapp}\n` +
      `⚽ ${datos.modalidad} · ${datos.nivel}`
    );
  }
  return JSON.stringify(datos);
}

// ── Funciones de envío ───────────────────────────────────

async function enviarMensaje(numero, texto) {
  if (process.env.NODE_ENV !== "production") {
    console.log(`[WhatsApp MOCK] → ${numero}\n${texto}\n`);
    return { sid: "MOCK_SID", status: "mock" };
  }

  const c = getClient();
  const msg = await c.messages.create({
    from: process.env.TWILIO_WHATSAPP_FROM,
    to: formatWA(numero),
    body: texto,
  });
  return { sid: msg.sid, status: msg.status };
}

async function notificarReserva(reserva) {
  // 1. Notificar al cliente
  await enviarMensaje(
    reserva.whatsapp_cliente,
    msgConfirmacionReserva(reserva)
  );

  // 2. Notificar al negocio
  await enviarMensaje(
    process.env.NEGOCIO_WHATSAPP.replace("whatsapp:", ""),
    msgNotificacionNegocio({ tipo: "nueva_reserva", datos: reserva })
  );
}

async function enviarReto(datos) {
  return enviarMensaje(datos.whatsapp_rival, msgRetoEquipo(datos));
}

async function notificarNuevoEquipo(equipo) {
  return enviarMensaje(
    process.env.NEGOCIO_WHATSAPP.replace("whatsapp:", ""),
    msgNotificacionNegocio({ tipo: "nuevo_equipo", datos: equipo })
  );
}

module.exports = {
  notificarReserva,
  enviarReto,
  notificarNuevoEquipo,
  enviarMensaje,
  formatWA,
};
