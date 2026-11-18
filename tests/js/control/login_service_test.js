import * as chai from "../lib/chai/index.js";
import sinon from "../lib/sinon/sinon-esm.js";
import LoginService from "../../../src/js/control/login_service.js";
import DefaultService from "../../../src/js/control/default_service.js";

const { expect } = chai;

describe("LoginService (autenticación de empleados)", () => {
  afterEach(() => sinon.restore());

  it("filtra tipos de documento inactivos", async () => {
    sinon.stub(DefaultService.prototype, "findAll").callsFake(async function () {
      if (this.URL.endsWith("tipoDocumento")) {
        return [{ idTipoDocumento: "dui", activo: true }, { idTipoDocumento: "pasaporte", activo: false }];
      }
      return [];
    });

    const tipos = await new LoginService().obtenerTiposDocumento();
    expect(tipos.map((tipo) => tipo.idTipoDocumento)).to.deep.equal(["dui"]);
  });

  it("valida que el tipo y el número de documento estén completos", async () => {
    const service = new LoginService();
    try {
      await service.autenticar({ idTipoDocumento: "", numeroDocumento: "" });
      expect.fail("Debía rechazar los datos incompletos");
    } catch (error) {
      expect(error).to.be.instanceOf(TypeError);
      expect(error.message).to.include("tipo");
    }
  });

  it("autentica por tipo y número, aceptando relaciones serializadas como objetos", async () => {
    sinon.stub(DefaultService.prototype, "findAll").callsFake(async function () {
      if (this.URL.endsWith("persona")) {
        return [{ idPersona: "p1", nombres: "Ana" }];
      }
      if (this.URL.endsWith("persona/p1/documento")) {
        return [{
          idPersona: { idPersona: "p1" },
          idTipoDocumento: { idTipoDocumento: "dui" },
          valor: " 01234567-8 ",
        }];
      }
      if (this.URL.endsWith("persona/p1/persona-rol")) {
        return [
          { idPersonaRol: "r-paciente", idRol: { nombre: "Paciente" } },
          { idPersonaRol: "r-empleado", idRol: { nombre: "Enfermería" } },
        ];
      }
      return [];
    });

    const resultado = await new LoginService().autenticar({
      idTipoDocumento: "dui",
      numeroDocumento: "01234567-8",
    });

    expect(resultado.persona.idPersona).to.equal("p1");
    expect(resultado.asignaciones.map((a) => a.idPersonaRol)).to.deep.equal(["r-empleado"]);
  });

  it("no permite acceder al dashboard cuando la persona solo tiene rol Paciente", async () => {
    sinon.stub(DefaultService.prototype, "findAll").callsFake(async function () {
      if (this.URL.endsWith("persona")) return [{ idPersona: "p1" }];
      if (this.URL.endsWith("persona/p1/documento")) {
        return [{ idPersona: "p1", idTipoDocumento: "dui", valor: "123" }];
      }
      if (this.URL.endsWith("persona/p1/persona-rol")) {
        return [{ idPersonaRol: "r1", idRol: { nombre: "Paciente" } }];
      }
      return [];
    });

    try {
      await new LoginService().autenticar({ idTipoDocumento: "dui", numeroDocumento: "123" });
      expect.fail("Debía rechazar una asignación exclusivamente de paciente");
    } catch (error) {
      expect(error.message).to.include("no tiene asignaciones de empleado");
    }
  });

  it("rechaza documentos que no corresponden al tipo o a la persona", async () => {
    sinon.stub(DefaultService.prototype, "findAll").callsFake(async function () {
      if (this.URL.endsWith("persona")) return [{ idPersona: "p1" }];
      if (this.URL.endsWith("persona/p1/documento")) {
        return [{ idPersona: "otra-persona", idTipoDocumento: "dui", valor: "123" }];
      }
      return [];
    });

    try {
      await new LoginService().autenticar({ idTipoDocumento: "dui", numeroDocumento: "123" });
      expect.fail("Debía indicar que no encontró al empleado");
    } catch (error) {
      expect(error.message).to.include("No se encontró un empleado");
    }
  });
});
