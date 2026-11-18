import * as chai from "../lib/chai/index.js";
import sinon from "../lib/sinon/sinon-esm.js";
import PersonaRolService from "../../../src/js/control/personaRol_service.js";

const { expect } = chai;

describe("PersonaRolService (personal por clínica)", () => {
  afterEach(() => sinon.restore());

  it("construye la ruta por persona cuando recibe su identificador", () => {
    const service = new PersonaRolService("persona / 1");
    expect(service.URL).to.include("persona/persona%20%2F%201/persona-rol");
  });

  it("usa la ruta general cuando no recibe persona", () => {
    expect(new PersonaRolService().URL).to.match(/persona-rol$/);
  });

  it("consulta el personal de la clínica y convierte los registros a PersonaRol", async () => {
    const respuesta = [{ idPersonaRol: "r1", idPersona: "p1", idClinica: "c1" }];
    const stub = sinon.stub(window, "fetch").resolves(new Response(JSON.stringify(respuesta), { status: 200 }));

    const resultado = await new PersonaRolService().listarPersonalDeClinica("clinica / 1");

    expect(stub.calledOnce).to.equal(true);
    expect(stub.firstCall.args[0]).to.include("clinica/clinica%20%2F%201/personal");
    expect(stub.firstCall.args[1].method).to.equal("GET");
    expect(resultado).to.have.length(1);
    expect(resultado[0].idPersonaRol).to.equal("r1");
    expect(resultado[0].idDePersona()).to.equal("p1");
  });

  it("rechaza cuando el backend no responde correctamente", async () => {
    sinon.stub(window, "fetch").resolves(new Response("Error", { status: 500 }));

    try {
      await new PersonaRolService().listarPersonalDeClinica("c1");
      expect.fail("Debía rechazar la consulta");
    } catch (error) {
      expect(error.message).to.equal("No se pudo obtener el personal de la clínica");
    }
  });
});
