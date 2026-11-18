/**
 * Pruebas de las reglas para asignar responsable de un paso.
 * Usa Sinon para inyectar el azar y comprobar cuándo se consulta.
 */
import * as chai from "../lib/chai/index.js";
import sinon from "../lib/sinon/sinon-esm.js";
import {
  ROL_PACIENTE,
  fueAtendido,
  candidatosResponsable,
  elegirResponsable,
  idClinicaDeConsulta,
} from "@service/atencion_consulta_responsable.js";
import { Estado } from "@service/estado_paso.js";

const { expect } = chai;

suite("responsables · ROL_PACIENTE", () => {
  test("el rol excluido por defecto es 'paciente'", () => {
    expect(ROL_PACIENTE).to.equal("paciente");
  });
});

suite("responsables · fueAtendido", () => {
  test("un paso sin fila no se ha atendido", () => {
    expect(fueAtendido(null)).to.be.false;
    expect(fueAtendido(undefined)).to.be.false;
  });

  test("un paso en estado Creado no se ha atendido", () => {
    expect(fueAtendido({ estado: Estado.CREADO })).to.be.false;
  });

  test("un paso En curso ya se atendió", () => {
    expect(fueAtendido({ estado: Estado.EN_CURSO })).to.be.true;
  });

  test("un paso Finalizado ya se atendió", () => {
    expect(fueAtendido({ estado: Estado.FINALIZADO })).to.be.true;
  });

  test("un paso Pendiente (al que se retrocedió) ya se atendió", () => {
    expect(fueAtendido({ estado: Estado.PENDIENTE })).to.be.true;
  });
});

suite("responsables · candidatosResponsable", () => {
  test("excluye a los pacientes sin importar mayúsculas ni espacios", () => {
    const lista = [
      { idPersonaRol: "1", idRol: { nombre: "Paciente" } },
      { idPersonaRol: "2", idRol: { nombre: "  PACIENTE " } },
      { idPersonaRol: "3", idRol: { nombre: "Médico" } },
    ];
    expect(
      candidatosResponsable(lista).map((c) => c.idPersonaRol),
    ).to.deep.equal(["3"]);
  });

  test("elimina repetidos conservando el primero", () => {
    const lista = [
      { idPersonaRol: "1", idRol: { nombre: "Médico" } },
      { idPersonaRol: "1", idRol: { nombre: "Enfermero" } },
    ];
    const resultado = candidatosResponsable(lista);
    expect(resultado).to.have.length(1);
    expect(resultado[0].idRol.nombre).to.equal("Médico");
  });

  test("descarta entradas sin id", () => {
    const lista = [
      { idRol: { nombre: "Médico" } },
      null,
      { idPersonaRol: "", idRol: { nombre: "Médico" } },
      { idPersonaRol: "7", idRol: { nombre: "Médico" } },
    ];
    expect(
      candidatosResponsable(lista).map((c) => c.idPersonaRol),
    ).to.deep.equal(["7"]);
  });

  test("conserva a quien trae el rol como id suelto o sin nombre", () => {
    const lista = [
      { idPersonaRol: "4", idRol: "uuid-del-rol" },
      { idPersonaRol: "5", idRol: null },
      { idPersonaRol: "6" },
    ];
    expect(
      candidatosResponsable(lista).map((c) => c.idPersonaRol),
    ).to.deep.equal(["4", "5", "6"]);
  });

  test("devuelve lista vacía para null o undefined", () => {
    expect(candidatosResponsable(null)).to.deep.equal([]);
    expect(candidatosResponsable(undefined)).to.deep.equal([]);
  });

  test("permite cambiar el rol excluido", () => {
    const lista = [
      { idPersonaRol: "1", idRol: { nombre: "Cliente" } },
      { idPersonaRol: "2", idRol: { nombre: "Paciente" } },
    ];
    const resultado = candidatosResponsable(lista, { rolPaciente: "cliente" });
    expect(resultado.map((c) => c.idPersonaRol)).to.deep.equal(["2"]);
  });

  test("no muta la lista recibida", () => {
    const lista = [
      { idPersonaRol: "1", idRol: { nombre: "Paciente" } },
      { idPersonaRol: "2", idRol: { nombre: "Médico" } },
    ];
    candidatosResponsable(lista);
    expect(lista).to.have.length(2);
  });
});

suite("responsables · elegirResponsable", () => {
  let sandbox;

  setup(() => {
    sandbox = sinon.createSandbox();
  });

  teardown(() => {
    sandbox.restore();
  });

  test("devuelve null si no hay candidatos y no consulta el azar", () => {
    const azar = sandbox.stub().returns(0.5);
    expect(elegirResponsable([], azar)).to.equal(null);
    expect(azar.notCalled).to.be.true;
  });

  test("devuelve null si lo recibido no es un arreglo", () => {
    expect(elegirResponsable(null)).to.equal(null);
    expect(elegirResponsable("abc")).to.equal(null);
  });

  test("usa el azar inyectado una sola vez para escoger el índice", () => {
    const azar = sandbox.stub().returns(0.5);
    expect(elegirResponsable(["a", "b", "c"], azar)).to.equal("b");
    expect(azar.calledOnce).to.be.true;
  });

  test("con azar 0 elige el primero", () => {
    expect(elegirResponsable(["a", "b", "c"], () => 0)).to.equal("a");
  });

  test("con azar cercano a 1 elige el último", () => {
    expect(elegirResponsable(["a", "b", "c"], () => 0.999)).to.equal("c");
  });

  test("acota el índice si el azar se sale del rango [0, 1)", () => {
    expect(elegirResponsable(["a", "b", "c"], () => 1)).to.equal("c");
    expect(elegirResponsable(["a", "b", "c"], () => 7)).to.equal("c");
    expect(elegirResponsable(["a", "b", "c"], () => -0.5)).to.equal("a");
  });

  test("si el azar no devuelve un número válido, elige el primero", () => {
    expect(elegirResponsable(["a", "b"], () => NaN)).to.equal("a");
    expect(elegirResponsable(["a", "b"], () => "abc")).to.equal("a");
    expect(elegirResponsable(["a", "b"], () => undefined)).to.equal("a");
  });

  test("por defecto usa Math.random", () => {
    sandbox.stub(Math, "random").returns(0.7);
    expect(elegirResponsable(["a", "b"])).to.equal("b");
  });
});

suite("responsables · idClinicaDeConsulta", () => {
  test("toma la clínica directa cuando es un id", () => {
    expect(idClinicaDeConsulta({ clinica: "cl-1" })).to.equal("cl-1");
  });

  test("toma la clínica directa cuando es una entidad anidada", () => {
    expect(idClinicaDeConsulta({ clinica: { idClinica: "cl-2" } })).to.equal(
      "cl-2",
    );
  });

  test("la clínica directa tiene prioridad sobre la del persona_rol", () => {
    const consulta = {
      clinica: "directa",
      idPersonaRol: { idClinica: "del-rol" },
    };
    expect(idClinicaDeConsulta(consulta)).to.equal("directa");
  });

  test("usa la clínica del persona_rol anidado (como id)", () => {
    expect(
      idClinicaDeConsulta({ idPersonaRol: { idClinica: "cl-3" } }),
    ).to.equal("cl-3");
  });

  test("usa la clínica del persona_rol anidado (como entidad)", () => {
    const consulta = { idPersonaRol: { idClinica: { idClinica: "cl-4" } } };
    expect(idClinicaDeConsulta(consulta)).to.equal("cl-4");
  });

  test("devuelve null si la consulta no la trae", () => {
    expect(idClinicaDeConsulta(null)).to.equal(null);
    expect(idClinicaDeConsulta(undefined)).to.equal(null);
    expect(idClinicaDeConsulta({})).to.equal(null);
    expect(idClinicaDeConsulta({ idPersonaRol: "solo-uuid" })).to.equal(null);
    expect(idClinicaDeConsulta({ idPersonaRol: {} })).to.equal(null);
  });
});
