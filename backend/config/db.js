// backend/config/db.js

const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI;

    if (!uri) {
      throw new Error("MONGO_URI no está definida en el archivo .env");
    }

    await mongoose.connect(uri);

    console.log("✅ Conectado a MongoDB Atlas");
  } catch (err) {
    console.error("❌ Error al conectar a MongoDB:", err);
    // Para entornos de desarrollo está bien cortar el proceso
    process.exit(1);
  }
};

module.exports = connectDB;
