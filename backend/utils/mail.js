// utils/mail.js
// Envío de mails. En desarrollo solo hace console.log del código.

async function sendVerificationEmail(to, code) {
  // En desarrollo:
  console.log("======================================");
  console.log("[MAIL DEV] Enviar a:", to);
  console.log("[MAIL DEV] Código de verificación:", code);
  console.log("======================================");

  // En producción: aquí configurás nodemailer con SMTP real.
}

module.exports = {
  sendVerificationEmail,
};
