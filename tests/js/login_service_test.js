
import * as chai from "../js/lib/chai/index.js";
import sinon from "../js/lib/sinon/sinon-esm.js";
import LoginService from "../../src/js/control/login_service.js";
import PersonaService from "../../src/js/control/persona_service.js";
import DocumentoService from "../../src/js/control/documento_service.js";
import PersonaRolService from "../../src/js/control/personaRol_service.js";
import TipoDocumentoService from "../../src/js/control/tipoDocumento_service.js";

mocha.setup("tdd");
const { expect } = chai;

suite("LoginService", function () {
  teardown(function () {
    sinon.restore();
  });

  test("returns available document types", async function () {
    sinon.stub(TipoDocumentoService.prototype, "findAll").resolves([
      { idTipoDocumento: "1", activo: true },
      { idTipoDocumento: "2", activo: false }
    ]);

    const result = await new LoginService().obtenerTiposDocumento();

    expect(result.map(tipo => tipo.idTipoDocumento)).to.deep.equal(["1"]);
  });

  test("rejects empty credentials without querying people", async function () {
    const findPeople = sinon.stub(PersonaService.prototype, "findAll");

    const error = await new LoginService()
      .autenticar({ idTipoDocumento: "", numeroDocumento: "" })
      .catch(error => error);

    expect(error).to.be.instanceOf(TypeError);
    expect(findPeople.called).to.equal(false);
  });

  test("authenticates an employee using their document", async function () {
    const persona = { idPersona: "person-1" };
    const asignaciones = [{ idPersonaRol: "assignment-1" }];

    sinon.stub(PersonaService.prototype, "findAll").resolves([persona]);
    sinon.stub(DocumentoService.prototype, "findAll").resolves([
      { valor: "01234567-8", idTipoDocumento: { idTipoDocumento: "type-1" } }
    ]);
    sinon.stub(PersonaRolService.prototype, "findAll").resolves(asignaciones);

    const result = await new LoginService().autenticar({
      idTipoDocumento: "type-1",
      numeroDocumento: "01234567-8"
    });

    expect(result).to.deep.equal({ persona, asignaciones });
  });

  test("rejects an employee without assignments", async function () {
    sinon.stub(PersonaService.prototype, "findAll").resolves([
      { idPersona: "person-1" }
    ]);
    sinon.stub(DocumentoService.prototype, "findAll").resolves([
      { valor: "A123", idTipoDocumento: "type-1" }
    ]);
    sinon.stub(PersonaRolService.prototype, "findAll").resolves([]);

    const error = await new LoginService().autenticar({
      idTipoDocumento: "type-1",
      numeroDocumento: "A123"
    }).catch(error => error);

    expect(error.message).to.include("no tiene asignaciones");
  });
});

mocha.run();