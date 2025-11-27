// create_admin.js
// Crear o actualizar un usuario ADMIN GENERAL para ZN98

require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");

async function run() {
  try {
    // Usamos la misma URI que el server.js
    const uri =
      process.env.MONGO_URI || "mongodb://127.0.0.1:27017/sitio98plus";

    console.log("Conectando a MongoDB...");
    await mongoose.connect(uri);
    console.log("✅ Conectado a MongoDB");

    // DATOS DEL ADMIN QUE VAMOS A CREAR / ACTUALIZAR
    const emailAdmin = "admin@example.com";
    const passwordPlano = "Admin1234";
    const matriculaAdmin = "999999"; // matrícula ficticia pero obligatoria

    const passwordHash = await bcrypt.hash(passwordPlano, 10);

    // Buscamos si ya existe un usuario con ese email
    let admin = await User.findOne({ email: emailAdmin });

    if (!admin) {
      console.log("No existe admin, creando uno nuevo...");

      admin = new User({
        nombre: "ADMIN",
        apellido: "GENERAL",
        email: emailAdmin,
        username: emailAdmin, // importante por el índice username
        passwordHash,
        matricula: matriculaAdmin,
        grado: "SM",
        dni: "00000000",
        role: "ADMIN",
        estado: "APROBADO",
        fecha_postulacion: new Date(),
      });
    } else {
      console.log("Ya existe un admin, actualizando contraseña y datos básicos...");
      admin.nombre = "ADMIN";
      admin.apellido = "GENERAL";
      admin.email = emailAdmin;
      admin.username = emailAdmin;
      admin.passwordHash = passwordHash;
      admin.matricula = admin.matricula || matriculaAdmin;
      admin.grado = admin.grado || "SM";
      admin.dni = admin.dni || "00000000";
      admin.role = "ADMIN";
      admin.estado = "APROBADO";
    }

    await admin.save();

    console.log("✅ Admin guardado correctamente:");
    console.log("   Email:", emailAdmin);
    console.log("   Clave:", passwordPlano);
    console.log("   Rol:  ", admin.role);
    console.log("   Estado:", admin.estado);
  } catch (err) {
    console.error("❌ Error en create_admin.js:", err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
