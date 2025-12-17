const mongoose = require("mongoose");

const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/zn98";

async function main() {
  console.log("──────────────────────────────────────");
  console.log("   Verificando base de datos ZN98");
  console.log("──────────────────────────────────────");
  console.log("Conectando a:", uri);

  await mongoose.connect(uri);
  console.log("✔ Conectado a MongoDB");

  const collections = await mongoose.connection.db.listCollections().toArray();

  console.log("\n📦 Colecciones encontradas:");
  collections.forEach((c) => console.log(" -", c.name));

  console.log("\n📊 Conteo de documentos por colección:");
  for (let c of collections) {
    const count = await mongoose.connection.db
      .collection(c.name)
      .countDocuments();
    console.log(` - ${c.name}: ${count}`);
  }

  console.log("\n👥 Primeros usuarios:");
  const users = await mongoose.connection.db
    .collection("users")
    .find({})
    .limit(5)
    .toArray();
  console.log(users);

  console.log("\n🏡 Viviendas registradas:");
  const viviendas = await mongoose.connection.db
    .collection("viviendas")
    .find({})
    .limit(5)
    .toArray();
  console.log(viviendas);

  console.log("\n🛏 Alojamientos registrados:");
  const aloj = await mongoose.connection.db
    .collection("alojamientos")
    .find({})
    .limit(5)
    .toArray();
  console.log(aloj);

  console.log("\n📝 Cantidad de anexos:");
  const anexCount = await mongoose.connection.db
    .collection("formsubmissions")
    .countDocuments();
  console.log("Anexos:", anexCount);

  console.log("\n✔ Revisión de BD finalizada");
  process.exit();
}

main();
