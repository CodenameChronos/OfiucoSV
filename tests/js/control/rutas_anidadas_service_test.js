import * as chai from "../lib/chai/index.js";
import ConsultaProcedimientoService from "../../../src/js/control/consultaProcedimiento_service.js";
import ConsultaProcedimientoPasoService from "../../../src/js/control/consultaProcedimientoPaso_service.js";
import DocumentoService from "../../../src/js/control/documento_service.js";

const { expect } = chai;

describe("servicios de recursos anidados (validación de identificadores)", () => {
  it("ConsultaProcedimientoPasoService exige el id del procedimiento y configura su ruta", () => {
    expect(() => new ConsultaProcedimientoPasoService()).to.throw(TypeError);
    const service = new ConsultaProcedimientoPasoService("procedimiento-1");
    expect(service.URL).to.include("consultaProcedimiento/procedimiento-1/paso");
  });

  it("ConsultaProcedimientoPasoService exige el id del procedimiento y configura su ruta", () => {
    expect(() => new ConsultaProcedimientoPasoService()).to.throw(TypeError);
    const service = new ConsultaProcedimientoPasoService("procedimiento-1");
    expect(service.URL).to.include(
      "consultaProcedimiento/procedimiento-1/paso"
    );
  });

  it("DocumentoService exige el id de persona y configura su ruta", () => {
    expect(() => new DocumentoService()).to.throw(TypeError);
    const service = new DocumentoService("persona-1");
    expect(service.URL).to.match(/persona\/persona-1\/documento$/);
  });
});
