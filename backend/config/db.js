// backend/config/db.js
const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const uri =
      process.env.MONGO_URI ||
      process.env.MONGODB_URI ||
      process.env.DATABASE_URL;

    if (!uri) {
      throw new Error(
        "No se encontró la URI de MongoDB. Define MONGO_URI (o MONGODB_URI) en el archivo .env"
      );
    }

    await mongoose.connect(uri);

    console.log("✅ MongoDB conectado correctamente");
  } catch (err) {
    console.error("❌ Error al conectar a MongoDB:", err.message);
    // Tiramos el error para que nodemon lo muestre y no quede en un estado raro
    throw err;
  }
};

module.exports = connectDB;
