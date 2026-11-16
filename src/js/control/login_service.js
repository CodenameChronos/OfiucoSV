import PersonaService from "./persona_service.js";
import PersonaRolService from "./personaRol_service.js";
import TipoDocumentoService from "./tipoDocumento_service.js";
import DocumentoService from "./documento_service.js";

/** Obtiene el UUID del propietario del documento, venga como UUID u objeto. */
const obtenerIdPersonaDocumento = (documento) => {
  const persona = documento?.idPersona;
  return typeof persona === "string" ? persona : persona?.idPersona ?? null;
};

/** Obtiene el nombre del rol de la asignación según la relación serializada. */
const obtenerNombreRol = (asignacion) => {
  const rol = asignacion?.idRol ?? asignacion?.rol;
  if (typeof rol === "string") return "";
  return String(rol?.nombre ?? rol?.nombreRol ?? asignacion?.nombreRol ?? "").trim();
};

/** Normaliza el nombre para comparar sin diferencias de mayúsculas o tildes. */
const normalizarTexto = (valor) => String(valor ?? "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .trim()
  .toLowerCase();

/** Una asignación de Paciente no habilita el acceso al dashboard de empleados. */
const esAsignacionEmpleado = (asignacion) => {
  const nombreRol = normalizarTexto(obtenerNombreRol(asignacion));
  return nombreRol !== "" && nombreRol !== "paciente" && !nombreRol.startsWith("paciente ");
};

/**
 * HU2: valida el documento de una persona y comprueba que tenga al menos
 * una asignación como empleado.
 */
export default class LoginService {
  async obtenerTiposDocumento() {
    const tipos = await new TipoDocumentoService().findAll();
    return tipos.filter((tipo) => tipo.activo !== false);
  }

  async autenticar({ idTipoDocumento, numeroDocumento }) {
    const tipoSeleccionado = String(idTipoDocumento ?? "").trim();
    const numeroIngresado = String(numeroDocumento ?? "").trim();

    if (!tipoSeleccionado || !numeroIngresado) {
      throw new TypeError("Seleccione el tipo e ingrese el número de documento.");
    }

    const personas = await new PersonaService().findAll();
    const numeroNormalizado = numeroIngresado.toLowerCase();

    for (const persona of personas) {
      if (!persona.idPersona) {
        continue;
      }

      const documentos = await new DocumentoService(persona.idPersona).findAll();
      const documentoValido = documentos.some((documento) => {
        const propietarioId = obtenerIdPersonaDocumento(documento);
        const tipoId = documento.tipoId?.()
          ?? (typeof documento.idTipoDocumento === "string"
            ? documento.idTipoDocumento
            : documento.idTipoDocumento?.idTipoDocumento);

        return (
          String(propietarioId ?? "").toLowerCase() === String(persona.idPersona).toLowerCase()
          && String(documento.valor ?? "").trim().toLowerCase() === numeroNormalizado
          && String(tipoId ?? "") === tipoSeleccionado
        );
      });

      if (!documentoValido) {
        continue;
      }

      const asignaciones = await new PersonaRolService(persona.idPersona).findAll();
      const asignacionesEmpleado = asignaciones.filter(esAsignacionEmpleado);

      if (asignacionesEmpleado.length === 0) {
        throw new Error(
          "El documento corresponde a una persona que no tiene asignaciones de empleado en GalenoSV."
        );
      }

      // HU3 solo debe recibir asignaciones de empleado, nunca la de Paciente.
      return { persona, asignaciones: asignacionesEmpleado };
    }

    throw new Error("No se encontró un empleado con ese tipo y número de documento.");
  }
}
