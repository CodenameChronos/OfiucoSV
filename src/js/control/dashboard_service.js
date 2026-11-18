/**
 * @fileoverview Servicio de agregación y consulta para el tablero principal (`DashboardService`).
 * Coordina llamadas a múltiples servicios REST (`PersonaService`, `PersonaRolService`,
 * `ConsultaService`, `ConsultaProcedimientoService` y `ConsultaProcedimientoPasoService`)
 * para resolver las consultas médicas y procedimientos cuyos pasos están asignados a una
 * relación `persona_rol` específica, filtrando además por rango de fechas local.
 */

import ConsultaService from "./consulta_service.js";
import ConsultaProcedimientoService from "./consultaProcedimiento_service.js";
import ConsultaProcedimientoPasoService from "./consultaProcedimientoPaso_service.js";
import PersonaService from "./persona_service.js";
import PersonaRolService from "./personaRol_service.js";

const normalizarEstado = (estado) =>
  String(estado ?? "")
    .toUpperCase()
    .replace(/[\s_]/g, "");

/**
 * Servicio de control encargado de consolidar la vista de consultas asignadas al
 * personal clínico para el dashboard principal.
 */
export default class DashboardService {
  /**
   * Extrae el identificador de un valor que puede venir como cadena directa (UUID/ID)
   * o como un objeto anidado que contiene la clave indicada en `propiedad`.
   *
   * @param {string|Object|null|undefined} valor - Identificador crudo o entidad anidada.
   * @param {string} propiedad - Nombre de la propiedad clave dentro del objeto (ej. `"idPersona"`).
   * @returns {string|null} Identificador extraído o `null` si no existe.
   */
  obtenerId(valor, propiedad) {
    if (!valor) return null;

    if (typeof valor === "string") {
      return valor;
    }

    return valor[propiedad] ?? null;
  }

  /**
   * Normaliza una fecha proveniente del API (eliminando el sufijo opcional `[UTC]`)
   * y la convierte en una instancia válida de `Date`.
   *
   * @param {string|number|Date|null|undefined} valor - Valor temporal a parsear.
   * @returns {Date|null} Objeto `Date` válido o `null` si la entrada está vacía o no es parseable.
   */
  convertirFecha(valor) {
    if (!valor) return null;

    const fechaNormalizada = String(valor).replace(/\[UTC\]$/, "");
    const fecha = new Date(fechaNormalizada);

    return Number.isNaN(fecha.getTime()) ? null : fecha;
  }

  /**
   * Recupera todas las personas registradas y consulta en paralelo sus asignaciones
   * `persona_rol`, enriqueciendo cada registro de rol con los datos básicos de la persona.
   *
   * @returns {Promise<Array<Object>>} Lista plana de registros `persona_rol` enriquecidos con `{ persona }`.
   */
  async obtenerRolesPersonas() {
    const personas = await new PersonaService().findAll();

    const rolesPorPersona = await Promise.all(
      personas.map(async (persona) => {
        const idPersona = this.obtenerId(persona.idPersona, "idPersona");

        if (!idPersona) return [];

        const roles = await new PersonaRolService(idPersona).findAll();

        return roles.map((rol) => ({
          ...rol,
          persona: {
            idPersona: idPersona,
            nombres: persona.nombres,
            apellidos: persona.apellidos,
          },
        }));
      }),
    );

    return rolesPorPersona.flat();
  }

  /**
   * Obtiene las consultas médicas que contienen al menos un procedimiento con pasos
   * asignados al empleado (`idPersonaRol`), aplicando opcionalmente filtros por fecha
   * de inicio (`desde` y `hasta` en formato `YYYY-MM-DD`) y resolviendo los datos del
   * paciente asociado a cada consulta.
   *
   * @param {string|Object} idPersonaRol - Identificador o entidad `persona_rol` del empleado autenticado.
   * @param {Object} [filtros={}] - Criterios opcionales de filtrado temporal.
   * @param {string} [filtros.desde=""] - Fecha mínima inclusiva en formato `YYYY-MM-DD`.
   * @param {string} [filtros.hasta=""] - Fecha máxima inclusiva en formato `YYYY-MM-DD`.
   * @returns {Promise<Array<Object>>} Lista de consultas únicas enriquecidas con `paciente` y `procedimientos` filtrados por asignación.
   * @throws {TypeError} Si `idPersonaRol` no es proporcionado.
   */
  async obtenerConsultas(idPersonaRol, filtros = {}) {
    if (!idPersonaRol) {
      throw new TypeError("La asignación de empleado es obligatoria.");
    }

    const idEmpleado = this.obtenerId(idPersonaRol, "idPersonaRol");

    const roles = await this.obtenerRolesPersonas();

    const personasPorRol = new Map();

    roles.forEach((rol) => {
      const idRol = this.obtenerId(rol.idPersonaRol, "idPersonaRol");

      if (idRol) {
        personasPorRol.set(idRol, rol.persona);
      }
    });

    const idsRoles = [...personasPorRol.keys()];

    const consultasPorRol = await Promise.all(
      idsRoles.map((idRol) => new ConsultaService(idRol).findAll()),
    );

    const todasLasConsultas = consultasPorRol.flat();

    const consultasUnicas = [
      ...new Map(
        todasLasConsultas.map((consulta) => [
          this.obtenerId(consulta.idConsulta, "idConsulta"),
          consulta,
        ]),
      ).values(),
    ];

    const desde = filtros.desde || "";
    const hasta = filtros.hasta || "";

    const consultasFiltradas = consultasUnicas.filter((consulta) => {
      const fecha = this.convertirFecha(consulta.fechaInicio);

      if (!fecha) return !desde && !hasta;

      const fechaDia = this.fechaLocalISO(fecha);

      return (!desde || fechaDia >= desde) && (!hasta || fechaDia <= hasta);
    });

    const consultasConAsignaciones = await Promise.all(
      consultasFiltradas.map(async (consulta) => {
        const idConsulta = this.obtenerId(consulta.idConsulta, "idConsulta");

        const idPaciente = this.obtenerId(
          consulta.idPersonaRol,
          "idPersonaRol",
        );

        const paciente = personasPorRol.get(idPaciente) ?? null;

        const procedimientos = await new ConsultaProcedimientoService(
          idConsulta,
        ).findAll();

        const procedimientosAsignados = await Promise.all(
          procedimientos.map(async (procedimiento) => {
            const idProcedimiento = this.obtenerId(
              procedimiento.idConsultaProcedimiento,
              "idConsultaProcedimiento",
            );

            const pasos = await new ConsultaProcedimientoPasoService(
              idProcedimiento,
            ).findAll();

            const pasosAsignados = pasos.filter((paso) => {
              const idAsignado = this.obtenerId(
                paso.idPersonaRol,
                "idPersonaRol",
              );
              if (idAsignado !== idEmpleado) return false;

              // Consulta finalizada: se muestra en "Finalizadas" si participó
              if (consulta.fechaFin) return true;

              const estado = normalizarEstado(paso.estado);
              return estado === "ENCURSO" || estado === "CREADO";
            });

            return {
              ...procedimiento,
              pasos: pasosAsignados,
            };
          }),
        );

        const procedimientosFiltrados = procedimientosAsignados.filter(
          (procedimiento) => procedimiento.pasos.length > 0,
        );

        return {
          ...consulta,
          paciente,
          procedimientos: procedimientosFiltrados,
        };
      }),
    );

    return consultasConAsignaciones.filter(
      (consulta) => consulta.procedimientos.length > 0,
    );
  }

  /**
   * Consulta el detalle completo de un paso específico perteneciente a un procedimiento de consulta.
   *
   * @param {string} idConsultaProcedimiento - UUID del procedimiento de consulta padre.
   * @param {string} idPaso - UUID del paso dentro del procedimiento.
   * @returns {Promise<Object>} Instancia o registro detallando el paso clínico solicitado.
   * @throws {TypeError} Si `idConsultaProcedimiento` o `idPaso` son nulos o vacíos.
   */
  async obtenerDetallePaso(idConsultaProcedimiento, idPaso) {
    if (!idConsultaProcedimiento || !idPaso) {
      throw new TypeError("Se requiere el procedimiento y el paso.");
    }

    return new ConsultaProcedimientoPasoService(
      idConsultaProcedimiento,
    ).findById(idPaso);
  }

  /**
   * Formatea una instancia de `Date` utilizando la zona horaria local en formato
   * ISO de solo fecha (`YYYY-MM-DD`).
   *
   * @param {Date} fecha - Fecha local a formatear.
   * @returns {string} Cadena de fecha en formato `YYYY-MM-DD`.
   */
  fechaLocalISO(fecha) {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    const dia = String(fecha.getDate()).padStart(2, "0");

    return `${anio}-${mes}-${dia}`;
  }
}
