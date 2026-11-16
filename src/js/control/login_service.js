import PersonaService from "./persona_service.js";
import PersonaRolService from "./personaRol_service.js";
import TipoDocumentoService from "./tipoDocumento_service.js";
import DocumentoService from "./documento_service.js";

/**
 * HU2: valida el documento de una persona y comprueba que tenga al menos
 * una asignación como empleado. La API del proyecto no expone un endpoint
 * de autenticación con contraseña o token.
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
        const tipoId = documento.tipoId?.()
          ?? (typeof documento.idTipoDocumento === "string"
            ? documento.idTipoDocumento
            : documento.idTipoDocumento?.idTipoDocumento);

        return (
          String(documento.valor ?? "").trim().toLowerCase() === numeroNormalizado
          && String(tipoId ?? "") === tipoSeleccionado
        );
      });

      if (!documentoValido) {
        continue;
      }

      const asignaciones = await new PersonaRolService(persona.idPersona).findAll();

      if (asignaciones.length === 0) {
        throw new Error(
          "El documento corresponde a una persona que no tiene asignaciones de empleado en GalenoSV."
        );
      }

      return { persona, asignaciones };
    }

    throw new Error("No se encontró un empleado con ese tipo y número de documento.");
  }
}
