import * as chai from "../lib/chai/index.js";
import {
  Estado,
  ErrorEstado,
  parsearEstado,
  puedeEditar,
  puedeAvanzar,
  puedeRetroceder,
  puedeFinalizar,
  alAvanzar,
  alRetroceder,
  alFinalizar,
  puedeFinalizarConsulta,
  alFinalizarConsulta,
  aEstadoVisual,
} from "../../../src/js/control/estado_paso.js";

const { expect } = chai;

describe("estado_paso (reglas de transición y edición)", () => {
  describe("parsearEstado", () => {
    it("reconoce estados sin distinguir mayúsculas ni espacios", () => {
      expect(parsearEstado("  eN cUrSo ")).to.equal(Estado.EN_CURSO);
      expect(parsearEstado("PENDIENTE")).to.equal(Estado.PENDIENTE);
    });

    it("devuelve null para estados desconocidos o valores que no son texto", () => {
      expect(parsearEstado("desconocido")).to.equal(null);
      expect(parsearEstado(null)).to.equal(null);
      expect(parsearEstado({ estado: Estado.EN_CURSO })).to.equal(null);
    });
  });

  describe("permisos del paso", () => {
    it("solo permite editar un paso En curso", () => {
      expect(puedeEditar(Estado.EN_CURSO)).to.equal(true);
      expect(puedeEditar(Estado.PENDIENTE)).to.equal(false);
      expect(puedeEditar(Estado.FINALIZADO)).to.equal(false);
    });

    it("avanza y retrocede únicamente si el paso está En curso y existe vecino", () => {
      expect(puedeAvanzar(Estado.EN_CURSO, true)).to.equal(true);
      expect(puedeAvanzar(Estado.EN_CURSO, false)).to.equal(false);
      expect(puedeRetroceder(Estado.EN_CURSO, true)).to.equal(true);
      expect(puedeRetroceder(Estado.PENDIENTE, true)).to.equal(false);
    });

    it("solo permite finalizar el último paso que está En curso", () => {
      expect(puedeFinalizar(Estado.EN_CURSO, false)).to.equal(true);
      expect(puedeFinalizar(Estado.EN_CURSO, true)).to.equal(false);
      expect(puedeFinalizar(Estado.PENDIENTE, false)).to.equal(false);
    });
  });

  describe("transiciones", () => {
    it("al avanzar finaliza el paso actual y pone el siguiente En curso", () => {
      expect(alAvanzar(Estado.EN_CURSO, true)).to.deep.equal({
        actual: Estado.FINALIZADO,
        siguiente: Estado.EN_CURSO,
      });
    });

    it("al retroceder deja pendiente el actual y pone el anterior En curso", () => {
      expect(alRetroceder(Estado.EN_CURSO, true)).to.deep.equal({
        actual: Estado.PENDIENTE,
        anterior: Estado.EN_CURSO,
      });
    });

    it("al finalizar devuelve el estado Finalizado", () => {
      expect(alFinalizar(Estado.EN_CURSO, false)).to.equal(Estado.FINALIZADO);
    });

    it("rechaza avanzar, retroceder o finalizar cuando la transición no corresponde", () => {
      expect(() => alAvanzar(Estado.EN_CURSO, false)).to.throw(ErrorEstado);
      expect(() => alAvanzar(Estado.PENDIENTE, true)).to.throw(ErrorEstado);
      expect(() => alRetroceder(Estado.EN_CURSO, false)).to.throw(ErrorEstado);
      expect(() => alFinalizar(Estado.EN_CURSO, true)).to.throw(ErrorEstado);
      expect(() => alFinalizar(Estado.PENDIENTE, false)).to.throw(ErrorEstado);
    });
  });

  describe("finalización de consulta", () => {
    it("solo permite finalizar cuando todos los procedimientos están completos", () => {
      expect(puedeFinalizarConsulta(true, false)).to.equal(true);
      expect(puedeFinalizarConsulta(false, false)).to.equal(false);
      expect(puedeFinalizarConsulta(true, true)).to.equal(false);
    });

    it("rechaza finalizar una consulta ya finalizada o incompleta", () => {
      expect(() => alFinalizarConsulta(true, true)).to.throw(ErrorEstado);
      expect(() => alFinalizarConsulta(false, false)).to.throw(ErrorEstado);
      expect(alFinalizarConsulta(true, false)).to.equal(undefined);
    });
  });

  describe("aEstadoVisual", () => {
    it("traduce los estados del backend al estado visual del stepper", () => {
      expect(aEstadoVisual(Estado.FINALIZADO)).to.equal("hecho");
      expect(aEstadoVisual(Estado.EN_CURSO)).to.equal("actual");
      expect(aEstadoVisual(Estado.PENDIENTE)).to.equal("pendiente");
      expect(aEstadoVisual("otro")).to.equal("pendiente");
    });
  });
});
