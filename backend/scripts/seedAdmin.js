// scripts/seedAdmin.js
// Crea un usuario ADMIN_GENERAL inicial si no existe ninguno.

require('dotenv').config();
const mongoose = require('mongoose');

// Usamos el mismo modelo que usa todo el backend
const { User } = require('../models/User');

async function main() {
  try {
    const mongoUri = process.env.MONGO_URL || process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('ERROR: No se encontró MONGO_URL ni MONGO_URI en .env');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('Conectado a MongoDB');

    // ¿Ya existe algún ADMIN_GENERAL?
    const yaHayAdminGeneral = await User.exists({ role: 'ADMIN_GENERAL' });

    if (yaHayAdminGeneral) {
      console.log('Ya existe al menos un usuario con rol ADMIN_GENERAL. No se crea otro.');
      await mongoose.disconnect();
      process.exit(0);
    }

    // Credenciales iniciales (luego las cambiás desde el sistema)
    const email = 'admin.general@zn98.local';
    const passwordPlano = 'Cambiar123!'; // IMPORTANTÍSIMO: cambiar después

    // Creamos el usuario
    const admin = new User({
      nombre: 'Admin',
      apellido: 'General',
      email,
      dni: '99999999',          // dato de prueba
      matricula: 'ADM0001',     // dato de prueba
      telefono: '',
      role: 'ADMIN_GENERAL',
      estadoHabitacional: 'SIN_VIVIENDA',
      activo: true,
      bloqueado: false,
    });

    // Usamos el método del modelo para setear password de forma segura
    if (typeof admin.setPassword === 'function') {
      await admin.setPassword(passwordPlano);
    } else {
      // Fallback por si el modelo no tiene setPassword (raro, pero por seguridad lo contemplamos)
      const bcrypt = require('bcryptjs');
      const hash = await bcrypt.hash(passwordPlano, 10);
      admin.passwordHash = hash;
    }

    await admin.save();

    console.log('─────────────────────────────────────────────');
    console.log('Usuario ADMIN_GENERAL creado correctamente:');
    console.log(`  Email:    ${email}`);
    console.log(`  Password: ${passwordPlano}`);
    console.log('─────────────────────────────────────────────');
    console.log('⚠️ IMPORTANTE: Cambiar esta contraseña apenas puedas.');
    console.log('─────────────────────────────────────────────');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error en seedAdmin:', err);
    process.exit(1);
  }
}

main();
