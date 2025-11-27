// backend/scripts/resetPassword.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const connectDB = require('../config/db');
const User = require('../models/user');

async function main() {
  try {
    console.log('Conectando a MongoDB Atlas...');
    await connectDB(process.env.MONGO_URI);

    const email = 'postulante@example.com';

    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      console.log('❌ No existe un usuario con ese email.');
      process.exit(0);
    }

    // Nueva contraseña
    const newPassword = '123456';
    await user.setPassword(newPassword);

    await user.save();

    console.log('✅ Contraseña reseteada correctamente:');
    console.log(`Usuario: ${email}`);
    console.log(`Nueva contraseña: ${newPassword}`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

main();
