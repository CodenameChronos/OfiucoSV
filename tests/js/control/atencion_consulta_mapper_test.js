/**
 * Pruebas de esProcedimientoPropio (atencion_consulta_mapper).
 * Un procedimiento es "propio" si su paso actual NO está finalizado y su
 * responsable es el empleado de la sesión.
 */
import * as chai from "../lib/chai/index.js";
import { esProcedimientoPropio } from "@service/atencion_consulta_mapper.js";
import { Estado } from "@service/estado_paso.js";

const { expect } = chai;

/** Procedimiento mínimo con un único paso "p1" como paso actual. */
const procedimiento = (fila) => ({
  idActual: "p1",
  filaPor: new Map(fila === undefined ? [] : [["p1", fila]]),
});

suite("mapper · esProcedimientoPropio", () => {
  test("es propio si el paso está en curso y el responsable es el empleado", () => {
    const proc = procedimiento({
      estado: Estado.EN_CURSO,
      idPersonaRol: "abc",
    });
    expect(esProcedimientoPropio(proc, "abc")).to.be.true;
  });

  test("compara ids sin importar mayúsculas", () => {
    const proc = procedimiento({
      estado: Estado.EN_CURSO,
      idPersonaRol: "ABC",
    });
    expect(esProcedimientoPropio(proc, "abc")).to.be.true;
  });

  test("acepta el responsable como objeto anidado", () => {
    const proc = procedimiento({
      estado: Estado.EN_CURSO,
      idPersonaRol: { idPersonaRol: "ABC" },
    });
    expect(esProcedimientoPropio(proc, "abc")).to.be.true;
  });

  test("acepta el empleado como objeto anidado (por idPersonaRol o por id)", () => {
    const proc = procedimiento({
      estado: Estado.EN_CURSO,
      idPersonaRol: "abc",
    });
    expect(esProcedimientoPropio(proc, { idPersonaRol: "ABC" })).to.be.true;
    expect(esProcedimientoPropio(proc, { id: "ABC" })).to.be.true;
  });

  test("no es propio si el responsable es otra persona", () => {
    const proc = procedimiento({
      estado: Estado.EN_CURSO,
      idPersonaRol: "xyz",
    });
    expect(esProcedimientoPropio(proc, "abc")).to.be.false;
  });

  test("no es propio si el paso ya está finalizado", () => {
    const proc = procedimiento({
      estado: Estado.FINALIZADO,
      idPersonaRol: "abc",
    });
    expect(esProcedimientoPropio(proc, "abc")).to.be.false;
  });

  test("no es propio si no se conoce al empleado", () => {
    const proc = procedimiento({
      estado: Estado.EN_CURSO,
      idPersonaRol: "abc",
    });
    expect(esProcedimientoPropio(proc, null)).to.be.false;
    expect(esProcedimientoPropio(proc, undefined)).to.be.false;
    expect(esProcedimientoPropio(proc, "")).to.be.false;
  });

  test("no es propio si el paso actual no tiene fila", () => {
    expect(esProcedimientoPropio(procedimiento(undefined), "abc")).to.be.false;
  });
});
