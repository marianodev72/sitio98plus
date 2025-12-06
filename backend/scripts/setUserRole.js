// scripts/setUserRole.js
// Cambia el role de un usuario identificado por email.

require('dotenv').config();
const mongoose = require('mongoose');

// Ajusta la ruta si tu models/User.js está en otra carpeta
const { User } = require('../models/User');

async function main() {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.DATABASE_URL;
    if (!mongoUri) {
      console.error('ERROR: No se encontró MONGO_URI ni DATABASE_URL en .env');
      process.exit(1);
    }

    // ⚠️ EDITA ESTAS DOS CONSTANTES ANTES DE EJECUTAR
    const emailObjetivo = 'INSPECTOR@ejemplo.com'; // email del usuario al que querés cambiar el rol
    const nuevoRole = 'INSPECTOR'; // por ejemplo: ADMIN, ADMIN_GENERAL, JEFE_DE_BARRIO, ALOJADO, etc.

    await mongoose.connect(mongoUri);
    console.log('Conectado a MongoDB');

    const usuario = await User.findOne({ email: emailObjetivo });

    if (!usuario) {
      console.error(`No se encontró usuario con email ${emailObjetivo}`);
      process.exit(1);
    }

    const roleAnterior = usuario.role;
    usuario.role = nuevoRole.toUpperCase();

    await usuario.save();

    console.log('Rol actualizado correctamente:');
    console.log(`- Usuario: ${usuario.email}`);
    console.log(`- Rol anterior: ${roleAnterior || '(sin role)'}`);
    console.log(`- Nuevo rol: ${usuario.role}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error actualizando rol:', err);
    process.exit(1);
  }
}

main();
