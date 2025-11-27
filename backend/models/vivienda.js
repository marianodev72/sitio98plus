// backend/models/vivienda.js  (o Vivienda.js)
// Modelo de viviendas fiscales ZN98

const mongoose = require("mongoose");

const viviendaSchema = new mongoose.Schema(
  {
    // Ej: "ALTE. STORNI", "LA MISION", "BARRIO CTE. PIEDRABUENA"
    barrio: { type: String, index: true },

    // Unidad o número de casa / departamento. Ej: "J-01", "K-02", "106"
    unidad: { type: String, index: true },

    // Cantidad de dormitorios
    dormitorios: { type: Number },

    // Campo libre para información adicional
    extra: { type: mongoose.Schema.Types.Mixed },

    // Marca cuándo fue importada desde el CSV
    importedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

// 👇 Evita OverwriteModelError cuando el archivo se evalúa más de una vez
const Vivienda =
  mongoose.models.Vivienda || mongoose.model("Vivienda", viviendaSchema);

module.exports = Vivienda;
