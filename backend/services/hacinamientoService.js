"use strict";

const CRITERIO = "ANEXO_17";

const SEMAFORO = Object.freeze({
  NO_APLICA: "NO_APLICA",
  SIN_DATOS: "SIN_DATOS",
  REQUIERE_EVALUACION: "REQUIERE_EVALUACION",
  ROJO: "ROJO",
  AMARILLO: "AMARILLO",
  VERDE: "VERDE",
});

function toIntegerOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const int = Math.trunc(n);
  return int >= 0 ? int : null;
}

function isOcupada(estadoVivienda) {
  return String(estadoVivienda || "").trim().toUpperCase() === "OCUPADA";
}

function normalizarSexoGenero(value) {
  const raw = String(value || "").trim().toUpperCase();
  if (!raw) return "";

  if (["M", "MASCULINO", "VARON", "VARON.", "VARONIL", "HOMBRE"].includes(raw)) {
    return "M";
  }

  if (["F", "FEMENINO", "MUJER"].includes(raw)) {
    return "F";
  }

  return "";
}

function resultadoMinimos(dormitoriosMinimosAnexo17, requiereEvaluacion = false, motivo = "") {
  return {
    dormitoriosMinimosAnexo17,
    requiereEvaluacion,
    motivo,
    criterio: CRITERIO,
  };
}

function calcularDormitoriosMinimosAnexo17({ adultos, hijos, hijosM, hijosF, hijosUnknown } = {}) {
  const adultosNum = toIntegerOrNull(adultos);
  const hijosMNum = toIntegerOrNull(hijosM) || 0;
  const hijosFNum = toIntegerOrNull(hijosF) || 0;
  const hijosUnknownNum = toIntegerOrNull(hijosUnknown) || 0;
  const hijosNumRaw = toIntegerOrNull(hijos);
  const hijosPorSexo = hijosMNum + hijosFNum + hijosUnknownNum;
  const hijosNum = hijosNumRaw === null ? hijosPorSexo : hijosNumRaw;

  if (adultosNum === null || hijosNum === null) {
    return resultadoMinimos(null, true, "COMPOSICION_FAMILIAR_INSUFICIENTE");
  }

  if (adultosNum !== 2) {
    return resultadoMinimos(null, true, "COMPOSICION_FAMILIAR_NO_CONTEMPLADA_ANEXO_17");
  }

  if (hijosNum !== hijosPorSexo) {
    return resultadoMinimos(null, true, "DISTRIBUCION_DE_HIJOS_INCONSISTENTE");
  }

  if (hijosNum > 4) {
    return resultadoMinimos(null, true, "MAS_DE_CUATRO_HIJOS_REQUIERE_EVALUACION");
  }

  if (hijosNum === 0) return resultadoMinimos(1);
  if (hijosNum === 1) return resultadoMinimos(2);

  if (hijosNum === 2) {
    if (hijosUnknownNum > 0) {
      return resultadoMinimos(null, true, "SEXO_GENERO_FALTANTE_DECISIVO");
    }

    if (hijosMNum === 2 || hijosFNum === 2) return resultadoMinimos(2);
    if (hijosMNum === 1 && hijosFNum === 1) return resultadoMinimos(3);

    return resultadoMinimos(null, true, "DISTRIBUCION_DE_HIJOS_NO_CONTEMPLADA");
  }

  if (hijosNum === 3) return resultadoMinimos(3);

  if (hijosNum === 4) {
    if (hijosUnknownNum > 0) {
      return resultadoMinimos(null, true, "SEXO_GENERO_FALTANTE_DECISIVO");
    }

    if (hijosMNum === 4 || hijosFNum === 4) return resultadoMinimos(3);
    if (hijosMNum === 2 && hijosFNum === 2) return resultadoMinimos(3);
    if (
      (hijosMNum === 3 && hijosFNum === 1) ||
      (hijosMNum === 1 && hijosFNum === 3)
    ) {
      return resultadoMinimos(4);
    }

    return resultadoMinimos(null, true, "DISTRIBUCION_DE_HIJOS_NO_CONTEMPLADA");
  }

  return resultadoMinimos(null, true, "COMPOSICION_FAMILIAR_NO_CONTEMPLADA_ANEXO_17");
}

function clasificarSemaforoHacinamiento({
  estadoVivienda,
  dormitoriosReales,
  dormitoriosMinimosAnexo17,
  requiereEvaluacion,
  motivo,
} = {}) {
  if (!isOcupada(estadoVivienda)) {
    return {
      semaforo: SEMAFORO.NO_APLICA,
      requiereEvaluacion: false,
      motivo: "VIVIENDA_NO_OCUPADA",
    };
  }

  const dormitorios = toIntegerOrNull(dormitoriosReales);
  if (!dormitorios || dormitorios <= 0) {
    return {
      semaforo: SEMAFORO.SIN_DATOS,
      requiereEvaluacion: false,
      motivo: "DORMITORIOS_SIN_DATOS",
    };
  }

  if (requiereEvaluacion) {
    return {
      semaforo: SEMAFORO.REQUIERE_EVALUACION,
      requiereEvaluacion: true,
      motivo: motivo || "REQUIERE_EVALUACION",
    };
  }

  const minimos = toIntegerOrNull(dormitoriosMinimosAnexo17);
  if (!minimos || minimos <= 0) {
    return {
      semaforo: SEMAFORO.SIN_DATOS,
      requiereEvaluacion: false,
      motivo: "DORMITORIOS_MINIMOS_SIN_DATOS",
    };
  }

  if (dormitorios < minimos) {
    return { semaforo: SEMAFORO.ROJO, requiereEvaluacion: false, motivo: "" };
  }

  if (dormitorios === minimos) {
    return { semaforo: SEMAFORO.AMARILLO, requiereEvaluacion: false, motivo: "" };
  }

  return { semaforo: SEMAFORO.VERDE, requiereEvaluacion: false, motivo: "" };
}

function calcularHacinamientoAnexo17({
  estadoVivienda,
  dormitoriosReales,
  adultos,
  hijos,
  hijosM,
  hijosF,
  hijosUnknown,
} = {}) {
  const adultosNum = toIntegerOrNull(adultos);
  const hijosMNum = toIntegerOrNull(hijosM) || 0;
  const hijosFNum = toIntegerOrNull(hijosF) || 0;
  const hijosUnknownNum = toIntegerOrNull(hijosUnknown) || 0;
  const hijosNumRaw = toIntegerOrNull(hijos);
  const hijosNum = hijosNumRaw === null ? hijosMNum + hijosFNum + hijosUnknownNum : hijosNumRaw;
  const dormitorios = toIntegerOrNull(dormitoriosReales);
  const habitantes =
    adultosNum === null || hijosNum === null ? null : adultosNum + hijosNum;

  const base = {
    habitantes,
    adultos: adultosNum,
    hijos: hijosNum,
    hijosM: hijosMNum,
    hijosF: hijosFNum,
    hijosUnknown: hijosUnknownNum,
    dormitoriosReales: dormitorios,
    dormitoriosMinimosAnexo17: null,
    ratioPersonasPorDormitorio:
      dormitorios && dormitorios > 0 && habitantes !== null
        ? habitantes / dormitorios
        : null,
    semaforo: SEMAFORO.SIN_DATOS,
    requiereEvaluacion: false,
    motivo: "",
    criterio: CRITERIO,
  };

  if (!isOcupada(estadoVivienda)) {
    return {
      ...base,
      semaforo: SEMAFORO.NO_APLICA,
      motivo: "VIVIENDA_NO_OCUPADA",
    };
  }

  if (!dormitorios || dormitorios <= 0) {
    return {
      ...base,
      semaforo: SEMAFORO.SIN_DATOS,
      motivo: "DORMITORIOS_SIN_DATOS",
    };
  }

  const minimos = calcularDormitoriosMinimosAnexo17({
    adultos: adultosNum,
    hijos: hijosNum,
    hijosM: hijosMNum,
    hijosF: hijosFNum,
    hijosUnknown: hijosUnknownNum,
  });

  const clasificacion = clasificarSemaforoHacinamiento({
    estadoVivienda,
    dormitoriosReales: dormitorios,
    dormitoriosMinimosAnexo17: minimos.dormitoriosMinimosAnexo17,
    requiereEvaluacion: minimos.requiereEvaluacion,
    motivo: minimos.motivo,
  });

  return {
    ...base,
    dormitoriosMinimosAnexo17: minimos.dormitoriosMinimosAnexo17,
    semaforo: clasificacion.semaforo,
    requiereEvaluacion: clasificacion.requiereEvaluacion,
    motivo: clasificacion.motivo,
  };
}

module.exports = {
  CRITERIO,
  SEMAFORO,
  normalizarSexoGenero,
  calcularDormitoriosMinimosAnexo17,
  clasificarSemaforoHacinamiento,
  calcularHacinamientoAnexo17,
};
