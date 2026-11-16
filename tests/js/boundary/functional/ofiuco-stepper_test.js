import { expect } from "chai";
import "../../../../src/js/boundary/components/functional/ofiuco-stepper.js";
import { ConsultaEventos } from "../../../../src/js/boundary/core/eventos-consulta.js";
import { mount, unmountAll } from "../../../helpers.js";

describe("<ofiuco-stepper>", () => {
  const spies = [];
  const listen = (name) => {
    const spy = sinon.spy();
    document.addEventListener(name, spy);
    spies.push([name, spy]);
    return spy;
  };

  afterEach(() => {
    unmountAll();
    spies.splice(0).forEach(([n, s]) => document.removeEventListener(n, s));
  });

  const progreso = (el) => el.shadowRoot.querySelector(".stepper__progreso");
  const anterior = (el) =>
    el.shadowRoot.querySelector("ofiuco-previous-button");
  const siguiente = (el) => el.shadowRoot.querySelector("ofiuco-next-button");
  const clic = (boton) => boton.shadowRoot.querySelector("button").click();

  const medio = {
    numero: 2,
    total: 5,
    puedeAvanzar: true,
    puedeRetroceder: true,
  };
  const primero = {
    numero: 1,
    total: 5,
    puedeAvanzar: true,
    puedeRetroceder: false,
  };
  const ultimo = {
    numero: 5,
    total: 5,
    puedeAvanzar: false,
    puedeRetroceder: true,
  };

  it("sin modelo no muestra progreso y deshabilita ambos botones", () => {
    const el = mount("ofiuco-stepper");

    expect(progreso(el).textContent).to.equal("");
    expect(anterior(el).disabled).to.equal(true);
    expect(siguiente(el).disabled).to.equal(true);
  });

  it('muestra "Paso N de M"', () => {
    const el = mount("ofiuco-stepper");

    el.model = medio;

    expect(progreso(el).textContent).to.equal("Paso 2 de 5");
  });

  it("en un paso intermedio habilita ambos botones", () => {
    const el = mount("ofiuco-stepper");

    el.model = medio;

    expect(anterior(el).disabled).to.equal(false);
    expect(siguiente(el).disabled).to.equal(false);
  });

  it("en el primer paso deshabilita Anterior", () => {
    const el = mount("ofiuco-stepper");

    el.model = primero;

    expect(anterior(el).disabled).to.equal(true);
    expect(siguiente(el).disabled).to.equal(false);
  });

  it("en el último paso deshabilita Avanzar", () => {
    const el = mount("ofiuco-stepper");

    el.model = ultimo;

    expect(anterior(el).disabled).to.equal(false);
    expect(siguiente(el).disabled).to.equal(true);
  });

  it("con busy deshabilita ambos y los recupera al quitarlo", () => {
    const el = mount("ofiuco-stepper");
    el.model = medio;

    el.setAttribute("busy", "");
    expect(anterior(el).disabled).to.equal(true);
    expect(siguiente(el).disabled).to.equal(true);

    el.removeAttribute("busy");
    expect(anterior(el).disabled).to.equal(false);
    expect(siguiente(el).disabled).to.equal(false);
  });

  it("acepta un modelo asignado antes de montarse", () => {
    const el = document.createElement("ofiuco-stepper");
    el.model = medio;

    document.querySelector("#fixture").append(el);

    expect(progreso(el).textContent).to.equal("Paso 2 de 5");
  });

  it("el clic en Avanzar emite PASO_SIGUIENTE", () => {
    const spy = listen(ConsultaEventos.PASO_SIGUIENTE);
    const el = mount("ofiuco-stepper");
    el.model = medio;

    clic(siguiente(el));

    expect(spy.calledOnce).to.equal(true);
  });

  it("el clic en Anterior emite PASO_ANTERIOR", () => {
    const spy = listen(ConsultaEventos.PASO_ANTERIOR);
    const el = mount("ofiuco-stepper");
    el.model = medio;

    clic(anterior(el));

    expect(spy.calledOnce).to.equal(true);
  });

  it("un botón deshabilitado no emite evento", () => {
    const spy = listen(ConsultaEventos.PASO_ANTERIOR);
    const el = mount("ofiuco-stepper");
    el.model = primero;

    clic(anterior(el));

    expect(spy.called).to.equal(false);
  });
});
