// backend/scripts/resetPermisionarioPassword.js
// Uso:
//    node scripts/resetPermisionarioPassword.js

require("dotenv").config();
const mongoose = require("mongoose");
const path = require("path");

const User = require(path.join(__dirname, "..", "models", "user"));

// CONFIGURAR ESTOS VALORES
const PERM_EMAIL = "permisionario@example.com";
const NEW_PASSWORD = "Permi123!";

(async () => {
  try {
    console.log("Conectando a MongoDB...");
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Conectado.\n");

    const email = PERM_EMAIL.toLowerCase();
    let user = await User.findOne({ email }).select("+password");

    if (!user) {
      console.log("❌ No se encontró usuario con email:", email);
      return;
    }

    console.log("🔎 Usuario encontrado:");
    console.log({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    console.log("\n🔐 Reseteando contraseña (setPassword)...");

    await user.setPassword(NEW_PASSWORD);
    await user.save();

    console.log("✅ Contraseña guardada. Verificando...");

    user = await User.findOne({ email }).select("+password");
    const ok = await user.checkPassword(NEW_PASSWORD);

    console.log("Resultado de checkPassword(NEW_PASSWORD):", ok);

    if (!ok) {
      console.log("⚠️ Algo anda mal, checkPassword devolvió false.");
    } else {
      console.log("\n👌 Podés loguearte con:");
      console.log("   Email:", PERM_EMAIL);
      console.log("   Clave:", NEW_PASSWORD);
    }
  } catch (err) {
    console.error("❌ Error reseteando contraseña de permisionario:", err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
})();
