/**
 * @fileoverview Servicio de autenticación del portal del personal (`LoginService`, HU2)
 * Valida las credenciales basadas en tipo y número de documento consultando los servicios
 * `TipoDocumentoService`, `PersonaService`, `DocumentoService` y `PersonaRolService`,
 * asegurando que la persona autenticada cuente con al menos una asignación de rol laboral
 * distinta de `"Paciente"` antes de conceder el acceso
 */

import PersonaService from "./persona_service.js";
import PersonaRolService from "./personaRol_service.js";
import TipoDocumentoService from "./tipoDocumento_service.js";
import DocumentoService from "./documento_service.js";

/**
 * Obtiene el UUID del propietario del documento, venga como UUID u objeto
 *
 * @param {Object|null|undefined} documento - Registro o entidad `Documento`
 * @returns {string|null} Identificador `idPersona` del propietario o `null` si no está definido
 */
const obtenerIdPersonaDocumento = (documento) => {
  const persona = documento?.idPersona;
  return typeof persona === "string" ? persona : persona?.idPersona ?? null;
};

/**
 * Obtiene el nombre del rol de la asignación según la relación serializada
 *
 * @param {Object|null|undefined} asignacion - Registro `PersonaRol` con relación de rol anidada o plana
 * @returns {string} Nombre limpio del rol o cadena vacía si no está disponible
 */
const obtenerNombreRol = (asignacion) => {
  const rol = asignacion?.idRol ?? asignacion?.rol;
  if (typeof rol === "string") return "";
  return String(rol?.nombre ?? rol?.nombreRol ?? asignacion?.nombreRol ?? "").trim();
};

/**
 * Normaliza el nombre para comparar sin diferencias de mayúsculas o tildes
 *
 * @param {*} valor - Texto a normalizar
 * @returns {string} Cadena en minúsculas y sin marcas diacríticas
 */
const normalizarTexto = (valor) => String(valor ?? "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .trim()
  .toLowerCase();

/**
 * Determina si una asignación de rol habilita el ingreso al portal del personal
 * Una asignación de Paciente no habilita el acceso al dashboard de empleados
 *
 * @param {Object} asignacion - Registro `PersonaRol` a evaluar
 * @returns {boolean} `true` si el rol corresponde a personal empleado (no vacío y distinto de `"paciente"`)
 */
const esAsignacionEmpleado = (asignacion) => {
  const nombreRol = normalizarTexto(obtenerNombreRol(asignacion));
  return nombreRol !== "" && nombreRol !== "paciente" && !nombreRol.startsWith("paciente ");
};

/**
 * Servicio de control para el inicio de sesión del personal institucional (HU2)
 *
 * Valida el documento de una persona y comprueba que tenga al menos
 * una asignación como empleado
 */
export default class LoginService {
  /**
   * Recupera el catálogo completo de tipos de documento y filtra únicamente
   * aquellos que se encuentran activos (`activo !== false`)
   *
   * @returns {Promise<Array<Object>>} Lista de tipos de documento habilitados para autenticación
   */
  async obtenerTiposDocumento() {
    const tipos = await new TipoDocumentoService().findAll();
    return tipos.filter((tipo) => tipo.activo !== false);
  }

  /**
   * Autentica a un empleado verificando la coincidencia exacta de `idTipoDocumento` y
   * `numeroDocumento` entre los documentos registrados de las personas del sistema,
   * y filtrando sus roles asignados para garantizar que posea al menos un rol laboral
   *
   * @param {Object} credenciales - Datos ingresados en el formulario de acceso
   * @param {string|number} credenciales.idTipoDocumento - Identificador del tipo de documento seleccionado
   * @param {string} credenciales.numeroDocumento - Número o valor del documento de identidad
   * @returns {Promise<{ persona: Object, asignaciones: Array<Object> }>} Objeto con los datos de la `persona` autenticada y sus `asignaciones` laborales activas
   * @throws {TypeError} Si faltan `idTipoDocumento` o `numeroDocumento`
   * @throws {Error} Si no existe coincidencia de documento o si la persona solo tiene rol de paciente
   */
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