
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
      {
        valor: "01234567-8",
        idPersona: { idPersona: "person-1" },
        idTipoDocumento: { idTipoDocumento: "type-1" }
      }
    ]);
    sinon.stub(PersonaRolService.prototype, "findAll").resolves(asignaciones);

    const result = await new LoginService().autenticar({
      idTipoDocumento: "type-1",
      numeroDocumento: "01234567-8"
    });

    expect(result).to.deep.equal({ persona, asignaciones });
  });

  test("does not authenticate a person with another person's document", async function () {
    const personaAna = { idPersona: "ana" };
    const personaSofia = { idPersona: "sofia" };
    const asignaciones = [{ idPersonaRol: "assignment-sofia", idRol: { nombre: "Enfermería" } }];

    sinon.stub(PersonaService.prototype, "findAll").resolves([personaAna, personaSofia]);
    sinon.stub(DocumentoService.prototype, "findAll").resolves([
      {
        valor: "22345678-9",
        idPersona: { idPersona: "ana" },
        idTipoDocumento: "type-1"
      },
      {
        valor: "12345678-9",
        idPersona: { idPersona: "sofia" },
        idTipoDocumento: "type-1"
      }
    ]);
    sinon.stub(PersonaRolService.prototype, "findAll").resolves(asignaciones);

    const result = await new LoginService().autenticar({
      idTipoDocumento: "type-1",
      numeroDocumento: "12345678-9"
    });

    expect(result.persona).to.equal(personaSofia);
    expect(result.asignaciones).to.equal(asignaciones);
  });

  test("rejects an employee without assignments", async function () {
    sinon.stub(PersonaService.prototype, "findAll").resolves([
      { idPersona: "person-1" }
    ]);
    sinon.stub(DocumentoService.prototype, "findAll").resolves([
      {
        valor: "A123",
        idPersona: { idPersona: "person-1" },
        idTipoDocumento: "type-1"
      }
    ]);
    sinon.stub(PersonaRolService.prototype, "findAll").resolves([]);

    const error = await new LoginService().autenticar({
      idTipoDocumento: "type-1",
      numeroDocumento: "A123"
    }).catch(error => error);

    expect(error.message).to.include("no tiene asignaciones");
  });
  test("rejects a person whose only assignment is Patient", async function () {
    sinon.stub(PersonaService.prototype, "findAll").resolves([
      { idPersona: "patient-1" }
    ]);
    sinon.stub(DocumentoService.prototype, "findAll").resolves([
      {
        valor: "P123",
        idPersona: { idPersona: "patient-1" },
        idTipoDocumento: "type-1"
      }
    ]);
    sinon.stub(PersonaRolService.prototype, "findAll").resolves([
      { idPersonaRol: "patient-assignment", idRol: { nombre: "Paciente" } }
    ]);

    const error = await new LoginService().autenticar({
      idTipoDocumento: "type-1",
      numeroDocumento: "P123"
    }).catch(error => error);

    expect(error.message).to.include("no tiene asignaciones de empleado");
  });

  test("keeps employee assignments and excludes Patient assignments", async function () {
    const persona = { idPersona: "person-1" };
    const asignacionMedico = {
      idPersonaRol: "assignment-doctor",
      idRol: { nombre: "Médico" }
    };
    const asignacionPaciente = {
      idPersonaRol: "assignment-patient",
      idRol: { nombre: "Paciente" }
    };

    sinon.stub(PersonaService.prototype, "findAll").resolves([persona]);
    sinon.stub(DocumentoService.prototype, "findAll").resolves([
      {
        valor: "A123",
        idPersona: { idPersona: "person-1" },
        idTipoDocumento: "type-1"
      }
    ]);
    sinon.stub(PersonaRolService.prototype, "findAll").resolves([
      asignacionPaciente,
      asignacionMedico
    ]);

    const result = await new LoginService().autenticar({
      idTipoDocumento: "type-1",
      numeroDocumento: "A123"
    });

    expect(result.asignaciones).to.deep.equal([asignacionMedico]);
  });

});

mocha.run();