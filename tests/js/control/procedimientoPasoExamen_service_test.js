import * as chai from "../lib/chai/index.js";
import sinon from "../lib/sinon/sinon-esm.js";
import ProcedimientoPasoExamenService from "../../../src/js/control/procedimientoPasoExamen_service.js";
import DefaultService from "../../../src/js/control/default_service.js";

const { expect } = chai;

describe("ProcedimientoPasoExamenService (exámenes disponibles por paso)", () => {
  afterEach(() => sinon.restore());

  it("usa la ruta anidada cuando recibe idExamen", () => {
    const service = new ProcedimientoPasoExamenService("examen-1");
    expect(service.URL).to.match(/examen\/examen-1\/paso$/);
  });

  it("valida ambos identificadores antes de consultar", async () => {
    const service = new ProcedimientoPasoExamenService();
    try {
      await service.listarPorProcedimientoPaso(null, "paso-1");
      expect.fail("Debía validar el procedimiento");
    } catch (error) {
      expect(error).to.be.instanceOf(TypeError);
      expect(error.message).to.include("idProcedimiento es obligatorio");
    }
    try {
      await service.listarPorProcedimientoPaso("procedimiento-1", "");
      expect.fail("Debía validar el paso");
    } catch (error) {
      expect(error).to.be.instanceOf(TypeError);
      expect(error.message).to.include("idProcedimientoPaso es obligatorio");
    }
  });

  it("devuelve solo exámenes activos asociados al paso solicitado", async () => {
    const paso = "AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA";
    sinon.stub(DefaultService.prototype, "findAll").resolves([
      { idProcedimientoPasoExamen: "ppe-1", idProcedimientoPaso: paso, activo: true },
      { idProcedimientoPasoExamen: "ppe-2", idProcedimientoPaso: { idProcedimientoPaso: paso.toLowerCase() }, activo: false },
      { idProcedimientoPasoExamen: "ppe-3", idProcedimientoPaso: "otro-paso", activo: true },
      { idProcedimientoPasoExamen: "ppe-4", idProcedimientoPaso: paso.toLowerCase(), activo: null },
    ]);

    const resultado = await new ProcedimientoPasoExamenService().listarPorProcedimientoPaso("proc-1", paso);

    expect(resultado.map((ppe) => ppe.idProcedimientoPasoExamen)).to.deep.equal(["ppe-1", "ppe-4"]);
  });
});
