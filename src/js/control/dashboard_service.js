import ConsultaService from "./consulta_service.js";
import ConsultaProcedimientoService from "./consultaProcedimiento_service.js";
import ConsultaProcedimientoPasoService from "./consultaProcedimientoPaso_service.js";

/**
 * HU3: reúne consultas, procedimientos y pasos
 * de una asignación de empleado.
 */
export default class DashboardService {
  /**
   * Convierte las fechas que devuelve Java (por ejemplo,
   * 2026-11-15T00:05:41.135Z[UTC]) a fechas válidas en JavaScript.
   */
  convertirFecha(valor) {
    if (!valor) {
      return null;
    }

    const fechaNormalizada = String(valor).replace(/\[UTC\]$/, "");
    const fecha = new Date(fechaNormalizada);

    return Number.isNaN(fecha.getTime()) ? null : fecha;
  }

  async obtenerConsultas(idPersonaRol, filtros = {}) {
    if (!idPersonaRol) {
      throw new TypeError("La asignación de empleado es obligatoria.");
    }

    const consultas = await new ConsultaService(idPersonaRol).findAll();

    const desde = filtros.desde || "";
    const hasta = filtros.hasta || "";

    const consultasFiltradas = consultas.filter((consulta) => {
      const fecha = this.convertirFecha(consulta.fechaInicio);

      if (!fecha) {
        return !desde && !hasta;
      }

      const fechaDia = this.fechaLocalISO(fecha);

      return (!desde || fechaDia >= desde) && (!hasta || fechaDia <= hasta);
    });

    return Promise.all(
      consultasFiltradas.map(async (consulta) => {
        const procedimientos = await new ConsultaProcedimientoService(
          consulta.idConsulta,
        ).findAll();

        const procedimientosConPasos = await Promise.all(
          procedimientos.map(async (procedimiento) => {
            const pasos = await new ConsultaProcedimientoPasoService(
              procedimiento.idConsultaProcedimiento,
            ).findAll();

            return {
              ...procedimiento,
              pasos,
            };
          }),
        );

        return {
          ...consulta,
          procedimientos: procedimientosConPasos,
        };
      }),
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
