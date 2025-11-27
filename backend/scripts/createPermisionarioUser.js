// backend/scripts/createPermisionarioUser.js
//
// Uso:
//   node scripts/createPermisionarioUser.js
//
// Ajustá las constantes PERM_* con los datos del permisionario.

require("dotenv").config();
const mongoose = require("mongoose");
const path = require("path");

// Modelos
const User = require(path.join(__dirname, "..", "models", "user"));
const Permisionario = require(path.join(
  __dirname,
  "..",
  "models",
  "permisionarioModel"
));

// 🔧 CONFIGURAR ESTOS VALORES:
const PERM_EMAIL = "permisionario@example.com";
const PERM_PASSWORD = "Permi123!";
const PERM_DNI = "12345678";
const PERM_MATRICULA = "11153";
const PERM_NOMBRE = "Carlos";
const PERM_APELLIDO = "Allievi";
const PERM_GRADO = "Cabo";
const PERM_TELEFONO = "299-1234567";
const PERM_DESTINO = "Área Naval Austral";
const PERM_UNIDAD = "ZN98";

(async () => {
  try {
    console.log("Conectando a MongoDB...");
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Conectado.");

    // 1) USER
    let user = await User.findOne({ email: PERM_EMAIL.toLowerCase() });

    if (!user) {
      console.log("No existe usuario, creando nuevo PERMISIONARIO...");
      user = new User({
        email: PERM_EMAIL.toLowerCase(),
        password: PERM_PASSWORD,
        nombre: PERM_NOMBRE,
        apellido: PERM_APELLIDO,
        role: "PERMISIONARIO",
        activo: true,
      });
    } else {
      console.log("Usuario encontrado. Actualizando rol a PERMISIONARIO...");
      user.role = "PERMISIONARIO";
      user.activo = true;
      if (PERM_PASSWORD) {
        user.password = PERM_PASSWORD; // se vuelve a hashear en el pre-save
      }
    }

    await user.save();
    console.log("✅ Usuario PERMISIONARIO listo:", {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    // 2) PERMISIONARIO
    let perm = await Permisionario.findOne({
      email: PERM_EMAIL.toLowerCase(),
    });

    if (!perm) {
      console.log("No existe registro de permisionario, creando nuevo...");
      perm = new Permisionario({
        dni: PERM_DNI,
        matricula: PERM_MATRICULA,
        nombre: PERM_NOMBRE,
        apellido: PERM_APELLIDO,
        grado: PERM_GRADO,
        email: PERM_EMAIL.toLowerCase(),
        telefono: PERM_TELEFONO,
        destino: PERM_DESTINO,
        unidad: PERM_UNIDAD,
        estado: "ACTIVO",
        user: user._id,
      });
    } else {
      console.log("Permisionario encontrado. Actualizando datos básicos...");
      perm.dni = PERM_DNI || perm.dni;
      perm.matricula = PERM_MATRICULA || perm.matricula;
      perm.nombre = PERM_NOMBRE || perm.nombre;
      perm.apellido = PERM_APELLIDO || perm.apellido;
      perm.grado = PERM_GRADO || perm.grado;
      perm.telefono = PERM_TELEFONO || perm.telefono;
      perm.destino = PERM_DESTINO || perm.destino;
      perm.unidad = PERM_UNIDAD || perm.unidad;
      perm.estado = perm.estado || "ACTIVO";
      perm.email = PERM_EMAIL.toLowerCase();
      perm.user = user._id;
    }

    await perm.save();

    console.log("✅ Registro de permisionario listo:");
    console.log({
      id: perm._id.toString(),
      dni: perm.dni,
      matricula: perm.matricula,
      email: perm.email,
      user: perm.user.toString(),
    });
  } catch (err) {
    console.error("❌ Error creando permisionario:", err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
})();
