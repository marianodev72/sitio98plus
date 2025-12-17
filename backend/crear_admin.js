const { User } = require('./models/User');
const mongoose = require('mongoose');

(async () => {
  await mongoose.connect('mongodb://127.0.0.1:27017/zn98');

  const user = new User({
    nombre: 'Admin',
    apellido: 'General',
    email: 'admin@zn98.local',
    dni: '00000000',
    matricula: 'X001',
    role: 'ADMIN_GENERAL',
  });

  await user.setPassword('Temporal2025');
  await user.save();

  console.log('Usuario ADMIN_GENERAL creado:');
  console.log('email: admin@zn98.local');
  console.log('password: Temporal2025');

  process.exit();
})();
