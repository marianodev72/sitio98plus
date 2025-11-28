// backend/scripts/resetAdminPassword.js
// Uso:
//    node scripts/resetAdminPassword.js

require("dotenv").config();
const mongoose = require("mongoose");
const path = require("path");

// Importa modelo User
const User = require(path.join(__dirname, "..", "models", "user"));

// CONFIGURAR ESTOS VALORES
const ADMIN_EMAIL = "admin@example.com";   // el email del admin existente
const NEW_PASSWORD = "123456";          // Nueva contraseña deseada

(async () => {
  try {
    console.log("Conectando a MongoDB...");
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Conectado.\n");

    const email = ADMIN_EMAIL.toLowerCase();
    let user = await User.findOne({ email }).select("+password");

    if (!user) {
      console.log("❌ No se encontró un usuario ADMIN con ese email:", email);
      return;
    }

    console.log("🔎 Usuario encontrado:");
    console.log({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    console.log("\n🔐 Reseteando contraseña usando setPassword()...");

    // 👉 ESTA es la forma correcta según tu modelo
    await user.setPassword(NEW_PASSWORD);

    await user.save();

    console.log("✅ Contraseña guardada. Verificando con checkPassword...");

    // Volvemos a cargar para asegurarnos de que quedó bien
    user = await User.findOne({ email }).select("+password");
    const ok = await user.checkPassword(NEW_PASSWORD);

    console.log("Resultado de checkPassword(NEW_PASSWORD):", ok);

    if (!ok) {
      console.log(
        "⚠️ Atención: checkPassword devolvió false, algo sigue mal con el hash."
      );
    } else {
      console.log("\n👌 Todo bien. Podés loguearte con:");
      console.log("   Email:", ADMIN_EMAIL);
      console.log("   Clave:", NEW_PASSWORD);
    }
  } catch (err) {
    console.error("❌ Error reseteando la contraseña del admin:", err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
})();
