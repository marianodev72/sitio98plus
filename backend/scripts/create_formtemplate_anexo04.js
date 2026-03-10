db = db.getSiblingDB("zn98"); // ⚠️ cambiar si tu DB tiene otro nombre

const existing = db.formtemplates.findOne({ code: "ANEXO_04", activo: true });

if (existing) {
  print("✔ ANEXO_04 ya existe y está activo. No se realizaron cambios.");
} else {
  const res = db.formtemplates.insertOne({
    code: "ANEXO_04",
    nombre: "ANEXO 04 – Aviso de ausencia prolongada",
    descripcion: "Trámite personal del Permisionario. Aviso de ausencia prolongada. Copia institucional a JEFE DE BARRIO, INSPECTOR, ADMIN y ADMIN_GENERAL.",
    version: 1,
    campos: [],
    activo: true,
    creadoPor: "sistema",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  print("✔ ANEXO_04 creado correctamente.");
  printjson(res);
}
