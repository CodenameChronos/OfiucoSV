import * as chai from "../lib/chai/index.js";
import sinon from "../lib/sinon/sinon-esm.js";
import DashboardService from "../../../src/js/control/dashboard_service.js";
import DefaultService from "../../../src/js/control/default_service.js";

const { expect } = chai;

describe("DashboardService (consultas asignadas al empleado)", () => {
  afterEach(() => sinon.restore());

  it("normaliza ids en texto u objeto y fechas inválidas", () => {
    const service = new DashboardService();
    expect(service.obtenerId("id-1", "id")).to.equal("id-1");
    expect(service.obtenerId({ id: "id-2" }, "id")).to.equal("id-2");
    expect(service.obtenerId(null, "id")).to.equal(null);
    expect(service.convertirFecha("2026-05-15T10:00:00Z[UTC]")).to.be.instanceOf(Date);
    expect(service.convertirFecha("fecha incorrecta")).to.equal(null);
    expect(service.convertirFecha(null)).to.equal(null);
  });

  it("obtiene roles asociados a cada persona y omite personas sin id", async () => {
    const service = new DashboardService();
    const stub = sinon.stub(DefaultService.prototype, "findAll").callsFake(async function () {
      if (this.URL.endsWith("persona")) {
        return [
          { idPersona: "p1", nombres: "Ana", apellidos: "López" },
          { idPersona: null, nombres: "Sin", apellidos: "Id" },
        ];
      }
      if (this.URL.endsWith("persona/p1/persona-rol")) {
        return [{ idPersonaRol: "r1", idRol: "enfermeria" }];
      }
      return [];
    });

    const roles = await service.obtenerRolesPersonas();

    expect(roles).to.have.length(1);
    expect(roles[0].persona).to.deep.equal({
      idPersona: "p1",
      nombres: "Ana",
      apellidos: "López",
    });
    expect(stub.calledTwice).to.equal(true);
  });

  it("rechaza obtener consultas si no se indica la asignación del empleado", async () => {
    const service = new DashboardService();
    try {
      await service.obtenerConsultas(null);
      expect.fail("Debía rechazar la solicitud");
    } catch (error) {
      expect(error).to.be.instanceOf(TypeError);
      expect(error.message).to.include("asignación de empleado");
    }
  });

  it("deduplica consultas, filtra por fechas y conserva solo pasos asignados al empleado", async () => {
    const service = new DashboardService();
    sinon.stub(DefaultService.prototype, "findAll").callsFake(async function () {
      if (this.URL.endsWith("persona")) {
        return [{ idPersona: "p1", nombres: "Daniela", apellidos: "Martínez" }];
      }
      if (this.URL.endsWith("persona/p1/persona-rol")) {
        return [
          { idPersonaRol: "r-empleado" },
          { idPersonaRol: "r-paciente", idRol: "paciente" },
        ];
      }
      if (this.URL.endsWith("persona-rol/r-empleado/consulta") || this.URL.endsWith("persona-rol/r-paciente/consulta")) {
        return [
          { idConsulta: "c1", idPersonaRol: "r-paciente", fechaInicio: "2026-05-15T10:00:00Z" },
          { idConsulta: "c2", idPersonaRol: "r-paciente", fechaInicio: "2026-05-20T10:00:00Z" },
        ];
      }
      if (this.URL.endsWith("consulta/c1/procedimiento")) {
        return [{ idConsultaProcedimiento: "cp1", nombre: "Procedimiento" }];
      }
      if (this.URL.endsWith("consulta/c2/procedimiento")) {
        return [{ idConsultaProcedimiento: "cp2" }];
      }
      if (this.URL.endsWith("consultaProcedimiento/cp1/paso")) {
        return [
          { idPersonaRol: "r-empleado", nombre: "Preparación" },
          { idPersonaRol: "otro-empleado", nombre: "Intervención" },
        ];
      }
      if (this.URL.endsWith("consultaProcedimiento/cp2/paso")) {
        return [{ idPersonaRol: "otro-empleado", nombre: "Finalización" }];
      }
      return [];
    });

    const resultado = await service.obtenerConsultas("r-empleado", {
      desde: "2026-05-15",
      hasta: "2026-05-15",
    });

    expect(resultado).to.have.length(1);
    expect(resultado[0].idConsulta).to.equal("c1");
    expect(resultado[0].paciente).to.deep.equal({
      idPersona: "p1",
      nombres: "Daniela",
      apellidos: "Martínez",
    });
    expect(resultado[0].procedimientos).to.have.length(1);
    expect(resultado[0].procedimientos[0].pasos.map((p) => p.nombre))
      .to.deep.equal(["Preparación"]);
  });

  it("obtiene el detalle del paso y valida los identificadores requeridos", async () => {
    const service = new DashboardService();
    try {
      await service.obtenerDetallePaso(null, "paso-1");
      expect.fail("Debía rechazar la solicitud");
    } catch (error) {
      expect(error).to.be.instanceOf(TypeError);
    }

    const stub = sinon.stub(DefaultService.prototype, "findById").resolves({ id: "paso-1" });
    expect(await service.obtenerDetallePaso("cp-1", "paso-1")).to.deep.equal({ id: "paso-1" });
    expect(stub.calledOnce).to.equal(true);
    expect(stub.firstCall.thisValue.URL).to.include("consultaProcedimiento/cp-1/paso");
  });

  it("formatea una fecha local como YYYY-MM-DD", () => {
    const service = new DashboardService();
    expect(service.fechaLocalISO(new Date(2026, 4, 9))).to.equal("2026-05-09");
  });
});
