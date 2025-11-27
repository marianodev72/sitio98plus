// backend/controllers/PostulacionesPdfController.js
// Generación de PDF para postulaciones (ANEXO 1 simplificado)

const PDFDocument = require("pdfkit");
const Postulacion = require("../models/Postulacion");

// Pequeño helper para formatear fechas dd/mm/aaaa hh:mm
function formatearFecha(fecha) {
  if (!fecha) return "";
  const d = new Date(fecha);
  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const anio = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${dia}/${mes}/${anio} ${hh}:${mm}`;
}

// GET /api/postulaciones/:id/pdf
async function generarPdfPostulacion(req, res) {
  try {
    const { id } = req.params;

    const postulacion = await Postulacion.findById(id)
      .populate("user", "nombre apellido grado dni matricula email role")
      .lean();

    if (!postulacion) {
      return res.status(404).json({ message: "Postulación no encontrada" });
    }

    const datos = postulacion.datos || {};
    const preferencias = postulacion.preferencias || {};
    const convivientes = datos.convivientes || [];
    const animales = datos.animales || [];
    const capacidadTotal = datos.capacidadTotal || 1;
    const user = postulacion.user || {};

    // Configuración de la respuesta HTTP
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="postulacion_${id}.pdf"`
    );

    const doc = new PDFDocument({ margin: 40 });
    doc.pipe(res);

    // -----------------------------------------------------------------------
    // Encabezado
    // -----------------------------------------------------------------------
    doc
      .fontSize(14)
      .text(
        "FORMULARIO DE INSCRIPCIÓN PARA OCUPAR VIVIENDA FISCAL (ANEXO 1)",
        { align: "center" }
      );
    doc.moveDown(0.5);
    doc
      .fontSize(11)
      .text("ARMADA ARGENTINA – ÁREA NAVAL AUSTRAL", { align: "center" });
    doc.moveDown(1);

    // Datos generales de la postulación
    doc
      .fontSize(10)
      .text(`Tipo de postulación: ${postulacion.tipo || ""}`, {
        continued: true,
      })
      .text(`   Estado: ${postulacion.estado || ""}`);
    doc.text(
      `Fecha de carga: ${formatearFecha(postulacion.createdAt) || ""}`
    );
    doc.moveDown(1);

    // -----------------------------------------------------------------------
    // Datos personales
    // -----------------------------------------------------------------------
    doc.fontSize(12).text("1) Datos personales", { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10);

    doc.text(`MR: ${datos.mr || ""}`);
    doc.text(`Nº afiliado DIBA: ${datos.nroAfiliadoDiba || ""}`);
    doc.text(`Grado y escalafón: ${datos.gradoEscalafon || ""}`);
    doc.text(`Apellido: ${datos.apellido || ""}`);
    doc.text(`Nombres: ${datos.nombres || ""}`);
    doc.text(`Destino actual: ${datos.destinoActual || ""}`);
    doc.text(`Destino futuro: ${datos.destinoFuturo || ""}`);
    doc.text(`Teléfono actual: ${datos.telefonoActual || ""}`);
    doc.text(`Teléfono futuro: ${datos.telefonoFuturo || ""}`);
    doc.text(`Fecha último ascenso: ${datos.fechaUltimoAscenso || ""}`);
    doc.text(`Años de servicio (según recibo): ${datos.aniosServicio || ""}`);
    doc.moveDown(1);

    // -----------------------------------------------------------------------
    // Declaraciones
    // -----------------------------------------------------------------------
    doc.fontSize(12).text("2) Declaraciones", { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10);

    const siNo = (v) => (v ? "SI" : "NO");

    doc.text(
      `Agrega fotocopia autenticada de FIDOFAC / Formulario Contribuyente: ${siNo(
        datos.adjuntaFidofac
      )}`
    );
    doc.text(
      `Tiene problemas socioeconómicos atendibles (según trámite iniciado): ${siNo(
        datos.problemasSocioeconomicos
      )}`
    );
    doc.text(
      `Es propietario de vivienda (él o familiares a cargo) en la zona naval: ${siNo(
        datos.esPropietarioViviendaEnZona
      )}`
    );
    doc.moveDown(1);

    // -----------------------------------------------------------------------
    // Convivientes a cargo
    // -----------------------------------------------------------------------
    doc
      .fontSize(12)
      .text(
        `3) Convivientes a cargo (capacidad familiar) – Capacidad total (titular + a cargo): ${capacidadTotal}`,
        { underline: true }
      );
    doc.moveDown(0.5);
    doc.fontSize(10);

    if (!convivientes.length) {
      doc.text("Sin convivientes declarados.");
    } else {
      convivientes.forEach((c, idx) => {
        doc.text(
          `${idx + 1}) ${c.apellidoNombres || ""}  – Relación: ${
            c.relacion || ""
          }  – A cargo: ${siNo(
            c.aCargo === true ||
              String(c.aCargo).toLowerCase() === "true"
          )}  – Edad: ${c.edad || ""}  – DNI: ${c.dni || ""}  – DIBA: ${
            c.diba || ""
          }`
        );
      });
    }
    doc.moveDown(1);

    // -----------------------------------------------------------------------
    // Animales domésticos
    // -----------------------------------------------------------------------
    doc
      .fontSize(12)
      .text("4) Animales domésticos (solo para vivienda tipo casa)", {
        underline: true,
      });
    doc.moveDown(0.5);
    doc.fontSize(10);

    if (!animales.length) {
      doc.text("Sin animales declarados.");
    } else {
      animales.forEach((a, idx) => {
        doc.text(
          `${idx + 1}) ${a.especie || ""} – Raza: ${a.raza || ""} – Edad: ${
            a.edad || ""
          } – Sexo: ${a.sexo || ""} – Peso (kg): ${a.pesoKg || ""}`
        );
      });
    }
    doc.moveDown(1);

    // -----------------------------------------------------------------------
    // Preferencias de vivienda (no vinculantes)
    // -----------------------------------------------------------------------
    doc
      .fontSize(12)
      .text("5) Preferencias de vivienda (no vinculantes)", {
        underline: true,
      });
    doc.moveDown(0.5);
    doc.fontSize(10);

    doc.text(`Barrio preferido: ${preferencias.barrioPreferido || ""}`);
    doc.text(`Tipo de vivienda: ${preferencias.tipoVivienda || ""}`);
    doc.moveDown(0.3);
    doc.text("Observaciones:");
    doc.text(preferencias.observaciones || "", {
      align: "justify",
      indent: 20,
    });
    doc.moveDown(1.5);

    // -----------------------------------------------------------------------
    // Pie de página – certificación
    // -----------------------------------------------------------------------
    doc.moveDown(1);
    doc
      .fontSize(9)
      .text(
        "--------------------------------------------------------------",
        { align: "center" }
      );
    doc.moveDown(0.3);

    const fechaEmision = formatearFecha(new Date());
    const grado =
      datos.gradoEscalafon || (user.grado ? String(user.grado) : "");
    const apellido = datos.apellido || user.apellido || "";
    const nombres = datos.nombres || user.nombre || "";
    const mr = datos.mr || user.matricula || "";

    doc.text(
      `Emitido el ${fechaEmision} por: ${grado} ${apellido}, ${nombres} (MR: ${mr})`,
      {
        align: "center",
      }
    );

    doc.end();
  } catch (err) {
    console.error("[PDF Postulación] Error:", err);
    if (!res.headersSent) {
      res
        .status(500)
        .json({ message: "Error generando el PDF de la postulación" });
    }
  }
}

module.exports = {
  generarPdfPostulacion,
};
