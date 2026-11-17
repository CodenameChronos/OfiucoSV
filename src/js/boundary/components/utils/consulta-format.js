/**
 * @file Formato de los datos de una consulta tal como los entrega el API.
 * Lo comparten el dashboard y los componentes que pintan una consulta.
 */

export const relationName = (value, fallback) => {
  if (typeof value === "string") return value;
  return value?.nombre ?? value?.descripcion ?? fallback;
};

export const formatDate = (value) => {
  if (!value) return "Sin fecha";
  const parsed = new Date(String(value).replace(/\[UTC\]$/, ""));
  return Number.isNaN(parsed.getTime()) ? "Fecha no válida" : parsed.toLocaleString("es-SV", {
    dateStyle: "medium", timeStyle: "short"
  });
};

export const getPatientName = (consultation) => {
  const patient = consultation?.paciente ?? consultation?.idPaciente ?? consultation?.persona ?? null;
  const fullName = [patient?.nombres, patient?.apellidos].filter(Boolean).join(" ").trim();
  return fullName || consultation?.nombrePaciente || "No disponible en los datos del API";
};
