import * as chai from "../lib/chai/index.js";
import sinon from "../lib/sinon/sinon-esm.js";
import ClinicaService from "../../../src/js/control/clinica_service.js";
import DefaultService from "../../../src/js/control/default_service.js";
import Clinica from "../../../src/js/entity/clinica.js";

const { expect } = chai;

describe("ClinicaService (conversión de respuestas)", () => {
  afterEach(() => sinon.restore());

  it("convierte los registros de findRange a entidades Clinica", async () => {
    sinon.stub(DefaultService.prototype, "findRange").resolves({
      registros: [{ idClinica: "c1", nombre: "Clínica Central" }],
      totalRegistros: 1,
    });

    const resultado = await new ClinicaService().findRange();
    expect(resultado.totalRegistros).to.equal(1);
    expect(resultado.registros[0]).to.be.instanceOf(Clinica);
    expect(resultado.registros[0].nombreClinica).to.equal("Clínica Central");
  });

  it("normaliza una respuesta sin arreglo de registros", async () => {
    sinon.stub(DefaultService.prototype, "findRange").resolves({ registros: null, totalRegistros: 0 });
    const resultado = await new ClinicaService().findRange();
    expect(resultado.registros).to.deep.equal([]);
  });

  it("convierte findById a una entidad Clinica y conserva null", async () => {
    const stub = sinon.stub(DefaultService.prototype, "findById").resolves({
      idClinica: "c1",
      nombre: "Clínica Central",
    });
    const resultado = await new ClinicaService().findById("c1");
    expect(stub.calledOnceWithExactly("c1")).to.equal(true);
    expect(resultado).to.be.instanceOf(Clinica);
    expect(resultado.nombreClinica).to.equal("Clínica Central");

    stub.resolves(null);
    expect(await new ClinicaService().findById("c2")).to.equal(null);
  });
});
