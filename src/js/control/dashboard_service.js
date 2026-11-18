import ConsultaService from "./consulta_service.js";
import ConsultaProcedimientoService from "./consultaProcedimiento_service.js";
import ConsultaProcedimientoPasoService from "./consultaProcedimientoPaso_service.js";
import PersonaService from "./persona_service.js";
import PersonaRolService from "./personaRol_service.js";

const normalizarEstado = (estado) =>
  String(estado ?? "")
    .toUpperCase()
    .replace(/[\s_]/g, "");

export default class DashboardService {
  obtenerId(valor, propiedad) {
    if (!valor) return null;

    if (typeof valor === "string") {
      return valor;
    }

    return valor[propiedad] ?? null;
  }

  convertirFecha(valor) {
    if (!valor) return null;

    const fechaNormalizada = String(valor).replace(/\[UTC\]$/, "");
    const fecha = new Date(fechaNormalizada);

    return Number.isNaN(fecha.getTime()) ? null : fecha;
  }

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

  async obtenerDetallePaso(idConsultaProcedimiento, idPaso) {
    if (!idConsultaProcedimiento || !idPaso) {
      throw new TypeError("Se requiere el procedimiento y el paso.");
    }

    return new ConsultaProcedimientoPasoService(
      idConsultaProcedimiento,
    ).findById(idPaso);
  }

  fechaLocalISO(fecha) {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    const dia = String(fecha.getDate()).padStart(2, "0");

    return `${anio}-${mes}-${dia}`;
  }
}
