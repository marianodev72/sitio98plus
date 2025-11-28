const mongoose = require("mongoose");

// Esquema de documentos subidos por el permisionario
const documentoSchema = new mongoose.Schema({
    permisionario: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Permisionario",
        required: true
    },
    nombreOriginal: { type: String, required: true },
    nombreAlmacenado: { type: String, required: true },
    tipoMime: { type: String, required: true },
    tamaño: { type: Number, required: true },
    url: { type: String, required: true },  // URL pública/privada según MinIO
    creadoEn: { type: Date, default: Date.now }
});

// FIX: evitar OverwriteModelError
module.exports = mongoose.models.PermisionarioDocumento ||
                 mongoose.model("PermisionarioDocumento", documentoSchema);
