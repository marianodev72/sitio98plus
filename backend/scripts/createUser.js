// backend/scripts/createUser.js
const path = require('path');

// Cargar variables de entorno del backend (.env)
require('dotenv').config({
  path: path.join(__dirname, '..', '.env'), // ../.env desde /scripts
});

const connectDB = require('../config/db');
const User = require('../models/user');

async function main() {
  try {
    console.log('Conectando a MongoDB Atlas...');
    await connectDB(process.env.MONGO_URI);

    // Crear usuario POSTULANTE de prueba
    const user = new User({
      email: 'postulante@example.com',
      nombre: 'Postulante',
      apellido: 'Demo',
      role: 'POSTULANTE',
      activo: true,
    });

    // Usamos el método del modelo para hashear la contraseña
    await user.setPassword('123456');

    await user.save();

    console.log('✅ Usuario creado correctamente:');
    console.log({
      email: user.email,
      role: user.role,
      activo: user.activo,
    });

    process.exit(0);
  } catch (err) {
    console.error('❌ Error creando usuario:', err);
    process.exit(1);
  }
}

main();