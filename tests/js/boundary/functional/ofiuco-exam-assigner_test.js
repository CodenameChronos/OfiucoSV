import * as chai from "../../lib/chai/index.js";
import sinon from "../../lib/sinon/sinon-esm.js";
import "../../../../src/js/boundary/components/functional/ofiuco-exam-assigner.js";
import { ConsultaEventos } from "../../../../src/js/boundary/core/eventos-consulta.js";

const modelo = (extra = {}) => ({
  catalogo: [
    { id: "a", nombre: "Glucosa", ordenado: true },
    { id: "b", nombre: "Hemograma", ordenado: false },
    { id: "c", nombre: "Orina", ordenado: false },
  ],
  seleccion: ["a", "b"],
  readonly: false,
  ...extra,
});

describe("<ofiuco-exam-assigner>", () => {
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

  const q = (el, selector) => el.shadowRoot.querySelector(selector);
  const buscador = (el) => q(el, "ofiuco-auto-complete");
  const asignados = (el) => [...el.shadowRoot.querySelectorAll(".asignado")];

  /** Abre el desplegable del buscador y elige la opción por posición. */
  const elegirOpcion = (el, posicion) => {
    const ac = buscador(el);
    ac.shadowRoot.querySelector("input").dispatchEvent(new FocusEvent("focus"));
    ac.shadowRoot.querySelectorAll(".options li button")[posicion].click();
  };

  it("sin modelo muestra el estado vacío", () => {
    const el = mount("ofiuco-exam-assigner");

    expect(asignados(el)).to.have.length(0);
    expect(q(el, ".vacio").hidden).to.equal(false);
  });

  it("lista los exámenes de la selección", () => {
    const el = mount("ofiuco-exam-assigner");

    el.model = modelo();

    expect(asignados(el)).to.have.length(2);
    expect(
      asignados(el)[0].querySelector(".asignado__nombre").textContent,
    ).to.equal("Glucosa");
    expect(q(el, ".vacio").hidden).to.equal(true);
  });

  it('marca "Pendiente de guardar" solo los que aún no están ordenados', () => {
    const el = mount("ofiuco-exam-assigner");

    el.model = modelo();

    expect(asignados(el)[0].querySelector(".asignado__pendiente")).to.equal(
      null,
    );
    expect(
      asignados(el)[1].querySelector(".asignado__pendiente").textContent,
    ).to.equal("Pendiente de guardar");
  });

  it("el buscador ofrece solo los exámenes que no están seleccionados", () => {
    const el = mount("ofiuco-exam-assigner");

    el.model = modelo();

    expect(buscador(el).options).to.deep.equal([
      { value: "c", label: "Orina" },
    ]);
  });

  it("el buscador se actualiza al cambiar la selección", () => {
    const el = mount("ofiuco-exam-assigner");
    el.model = modelo();

    el.model = modelo({ seleccion: [] });

    expect(buscador(el).options).to.have.length(3);
  });

  it("elegir una opción emite EXAMEN_AGREGADO y limpia el buscador", () => {
    const spy = listen(ConsultaEventos.EXAMEN_AGREGADO);
    const el = mount("ofiuco-exam-assigner");
    el.model = modelo();

    elegirOpcion(el, 0);

    expect(spy.calledOnce).to.equal(true);
    expect(spy.firstCall.args[0].detail).to.deep.equal({ id: "c" });
    expect(buscador(el).shadowRoot.querySelector("input").value).to.equal("");
  });

  it("los eventos internos del buscador no se filtran fuera", () => {
    const seleccion = listen("option-selected");
    const cambio = listen("value-changed");
    const el = mount("ofiuco-exam-assigner");
    el.model = modelo();

    elegirOpcion(el, 0);

    expect(seleccion.called).to.equal(false);
    expect(cambio.called).to.equal(false);
  });

  it("cada examen tiene un botón de quitar con su id y un nombre accesible", () => {
    const el = mount("ofiuco-exam-assigner");

    el.model = modelo();

    const boton = asignados(el)[0].querySelector("ofiuco-remove-exam-button");
    expect(boton.value).to.equal("a");
    expect(
      boton.shadowRoot.querySelector("button").getAttribute("aria-label"),
    ).to.equal("Quitar Glucosa");
  });

  it("el botón de quitar emite QUITAR_EXAMEN con el id", () => {
    const spy = listen(ConsultaEventos.QUITAR_EXAMEN);
    const el = mount("ofiuco-exam-assigner");
    el.model = modelo();

    asignados(el)[1]
      .querySelector("ofiuco-remove-exam-button")
      .shadowRoot.querySelector("button")
      .click();

    expect(spy.firstCall.args[0].detail).to.deep.equal({ value: "b" });
  });

  it("en solo lectura oculta el buscador y los botones de quitar", () => {
    const el = mount("ofiuco-exam-assigner");

    el.model = modelo({ readonly: true });

    expect(buscador(el).hidden).to.equal(true);
    expect(buscador(el).disabled).to.equal(true);
    expect(
      el.shadowRoot.querySelectorAll("ofiuco-remove-exam-button"),
    ).to.have.length(0);
    expect(asignados(el)).to.have.length(2);
  });

  it("un id seleccionado que no está en el catálogo se muestra igualmente", () => {
    const el = mount("ofiuco-exam-assigner");

    el.model = modelo({ seleccion: ["a", "zzz"] });

    expect(asignados(el)).to.have.length(2);
    expect(
      asignados(el)[1].querySelector(".asignado__nombre").textContent,
    ).to.equal("Examen");
  });

  it("el nombre se inserta como texto, nunca como HTML", () => {
    const el = mount("ofiuco-exam-assigner");

    el.model = modelo({
      catalogo: [
        { id: "a", nombre: "<img src=x onerror=alert(1)>", ordenado: true },
      ],
      seleccion: ["a"],
    });

    expect(q(el, ".asignados img")).to.equal(null);
  });
});
