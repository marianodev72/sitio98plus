// update-admin.js (temporal)
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/user');
require('dotenv').config();

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const hash = await bcrypt.hash('AlcaldiaZN98', 10);
  await User.findOneAndUpdate(
    { username: 'admin' },
    { password: hash, role: 'admin' },
    { new: true }
  );
  console.log('Admin actualizado');
  process.exit(0);
})();
