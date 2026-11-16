import * as chai from "./lib/chai/index.js";
import sinon from "./lib/sinon/sinon-esm.js";
import "../../src/js/boundary/components/functional/ofiuco-exam-results.js";
import { ConsultaEventos } from "../../src/js/boundary/core/eventos-consulta.js";

const { expect } = chai;

const mount = (tag, props = {}) => {
  let fixture = document.querySelector("#fixture");
  if (!fixture) {
    fixture = document.createElement("div");
    fixture.id = "fixture";
    document.body.appendChild(fixture);
  }
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === "model") {
      el.model = value;
    } else {
      el.setAttribute(key, value);
    }
  }
  fixture.appendChild(el);
  return el;
};

const unmountAll = () => {
  const fixture = document.querySelector("#fixture");
  if (fixture) {
    fixture.innerHTML = "";
  }
};

const modelo = (extra = {}) => ({
  items: [
    { id: "a", nombre: "Glucosa", tieneResultado: true, quitando: false },
    { id: "b", nombre: "Hemograma", tieneResultado: false, quitando: false },
    { id: "c", nombre: "Orina", tieneResultado: false, quitando: false },
  ],
  seleccionado: "a",
  valores: {
    a: { resultado: "90 mg/dl", interpretacion: "Normal" },
    b: { resultado: "", interpretacion: "" },
    c: { resultado: "", interpretacion: "" },
  },
  pendientes: 0,
  readonly: false,
  ...extra,
});

suite("<ofiuco-exam-results>", () => {
  const spies = [];
  const listen = (name) => {
    const spy = sinon.spy();
    document.addEventListener(name, spy);
    spies.push([name, spy]);
    return spy;
  };

  teardown(() => {
    unmountAll();
    spies.splice(0).forEach(([n, s]) => document.removeEventListener(n, s));
  });

  const q = (el, selector) => el.shadowRoot.querySelector(selector);
  const items = (el) => [
    ...el.shadowRoot.querySelectorAll('li[role="option"]'),
  ];
  const area = (el, campo) => q(el, `[data-campo="${campo}"]`);
  const escribir = (el, campo, texto) => {
    const interno = area(el, campo).shadowRoot.querySelector("textarea");
    interno.value = texto;
    interno.dispatchEvent(new Event("input"));
  };

  suite("sin exámenes ordenados", () => {
    test("muestra el mensaje de asignar y oculta lista y campos", () => {
      const el = mount("ofiuco-exam-results");
      el.model = modelo({ items: [], seleccionado: null, valores: {} });
      expect(q(el, ".vacio").hidden).to.equal(false);
      expect(q(el, ".vacio").textContent).to.contain("Asigne un examen");
      expect(q(el, ".lista").hidden).to.equal(true);
      expect(q(el, ".detalle").hidden).to.equal(true);
    });

    test("con exámenes pendientes pide guardar antes de registrar resultados", () => {
      const el = mount("ofiuco-exam-results");
      el.model = modelo({
        items: [],
        seleccionado: null,
        valores: {},
        pendientes: 2,
      });
      expect(q(el, ".vacio").textContent).to.contain("Guarde los cambios");
    });

    test("sin modelo se comporta como vacío", () => {
      const el = mount("ofiuco-exam-results");
      expect(q(el, ".lista").hidden).to.equal(true);
      expect(q(el, ".detalle").hidden).to.equal(true);
    });
  });

  suite("lista", () => {
    test("lista los exámenes y marca el seleccionado", () => {
      const el = mount("ofiuco-exam-results");
      el.model = modelo();
      expect(items(el).map((li) => li.textContent.trim())).to.have.length(3);
      expect(items(el)[0].getAttribute("aria-selected")).to.equal("true");
      expect(items(el)[1].getAttribute("aria-selected")).to.equal("false");
      expect(q(el, ".lista").getAttribute("aria-activedescendant")).to.equal(
        items(el)[0].id,
      );
    });

    test("marca los exámenes con resultado y avisa a lectores de pantalla", () => {
      const el = mount("ofiuco-exam-results");
      el.model = modelo();
      expect(items(el)[0].querySelector(".item__marca")).to.not.equal(null);
      expect(
        items(el)[0].querySelector(".solo-lectores").textContent,
      ).to.contain("con resultado");
      expect(items(el)[1].querySelector(".item__marca")).to.equal(null);
    });

    test("avisa de los exámenes que se quitarán al guardar", () => {
      const el = mount("ofiuco-exam-results");
      el.model = modelo({
        items: [
          { id: "a", nombre: "Glucosa", tieneResultado: false, quitando: true },
        ],
      });
      expect(items(el)[0].querySelector(".item__aviso").textContent).to.contain(
        "Se quitará al guardar",
      );
    });

    test("refleja un aumento o una disminución de exámenes tras guardar", () => {
      const el = mount("ofiuco-exam-results");
      el.model = modelo();
      expect(items(el)).to.have.length(3);

      el.model = modelo({ items: modelo().items.slice(0, 1) });
      expect(items(el)).to.have.length(1);

      el.model = modelo({
        items: [
          ...modelo().items,
          {
            id: "d",
            nombre: "Rayos X",
            tieneResultado: false,
            quitando: false,
          },
        ],
      });
      expect(items(el)).to.have.length(4);
    });

    test("el nombre se inserta como texto, nunca como HTML", () => {
      const el = mount("ofiuco-exam-results");
      el.model = modelo({
        items: [
          {
            id: "a",
            nombre: "<img src=x onerror=alert(1)>",
            tieneResultado: false,
            quitando: false,
          },
        ],
      });
      expect(q(el, ".lista img")).to.equal(null);
    });
  });

  suite("selección", () => {
    test("el clic en un examen emite EXAMEN_SELECCIONADO con su id", () => {
      const spy = listen(ConsultaEventos.EXAMEN_SELECCIONADO);
      const el = mount("ofiuco-exam-results");
      el.model = modelo();
      items(el)[1].click();
      expect(spy.calledOnce).to.equal(true);
      expect(spy.firstCall.args[0].detail).to.deep.equal({ id: "b" });
    });

    test("el clic en el ya seleccionado no emite", () => {
      const spy = listen(ConsultaEventos.EXAMEN_SELECCIONADO);
      const el = mount("ofiuco-exam-results");
      el.model = modelo();
      items(el)[0].click();
      expect(spy.called).to.equal(false);
    });

    [
      ["ArrowDown", "a", "b"],
      ["ArrowUp", "b", "a"],
      ["Home", "c", "a"],
      ["End", "a", "c"],
    ].forEach(([tecla, desde, hacia]) => {
      test(`${tecla} desde ${desde} selecciona ${hacia}`, () => {
        const spy = listen(ConsultaEventos.EXAMEN_SELECCIONADO);
        const el = mount("ofiuco-exam-results");
        el.model = modelo({ seleccionado: desde });
        q(el, ".lista").dispatchEvent(
          new KeyboardEvent("keydown", {
            key: tecla,
            bubbles: true,
            cancelable: true,
          }),
        );
        expect(spy.firstCall.args[0].detail).to.deep.equal({ id: hacia });
      });
    });

    test("en los extremos las flechas no emiten", () => {
      const spy = listen(ConsultaEventos.EXAMEN_SELECCIONADO);
      const el = mount("ofiuco-exam-results");
      el.model = modelo({ seleccionado: "a" });
      q(el, ".lista").dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }),
      );
      expect(spy.called).to.equal(false);
    });

    test("la flecha abajo sin selección elige el primero", () => {
      const spy = listen(ConsultaEventos.EXAMEN_SELECCIONADO);
      const el = mount("ofiuco-exam-results");
      el.model = modelo({ seleccionado: null });
      q(el, ".lista").dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
      );
      expect(spy.firstCall.args[0].detail).to.deep.equal({ id: "a" });
    });

    test("una tecla no soportada se ignora", () => {
      const spy = listen(ConsultaEventos.EXAMEN_SELECCIONADO);
      const el = mount("ofiuco-exam-results");
      el.model = modelo();
      q(el, ".lista").dispatchEvent(
        new KeyboardEvent("keydown", { key: "x", bubbles: true }),
      );
      expect(spy.called).to.equal(false);
    });
  });

  suite("campos de resultado e interpretación", () => {
    test("muestran los valores del examen seleccionado", () => {
      const el = mount("ofiuco-exam-results");
      el.model = modelo();
      expect(area(el, "resultado").value).to.equal("90 mg/dl");
      expect(area(el, "interpretacion").value).to.equal("Normal");
    });

    test("cambian de contenido al cambiar la selección", () => {
      const el = mount("ofiuco-exam-results");
      el.model = modelo();
      el.model = modelo({ seleccionado: "b" });
      expect(area(el, "resultado").value).to.equal("");
      expect(area(el, "interpretacion").value).to.equal("");
    });

    test("escribir emite RESULTADO_CAMBIADO con el examen, el campo y el valor", () => {
      const spy = listen(ConsultaEventos.RESULTADO_CAMBIADO);
      const el = mount("ofiuco-exam-results");
      el.model = modelo({ seleccionado: "b" });
      escribir(el, "resultado", "plaquetas bajas");
      escribir(el, "interpretacion", "Hay que repetirlo");
      expect(spy.firstCall.args[0].detail).to.deep.equal({
        id: "b",
        campo: "resultado",
        valor: "plaquetas bajas",
      });
      expect(spy.secondCall.args[0].detail).to.deep.equal({
        id: "b",
        campo: "interpretacion",
        valor: "Hay que repetirlo",
      });
    });

    test("el value-changed interno no se filtra fuera del componente", () => {
      const spy = listen("value-changed");
      const el = mount("ofiuco-exam-results");
      el.model = modelo();
      escribir(el, "resultado", "algo");
      expect(spy.called).to.equal(false);
    });

    test("reasignar el mismo valor no reescribe el campo (conserva el cursor)", () => {
      const el = mount("ofiuco-exam-results");
      el.model = modelo();
      escribir(el, "resultado", "90 mg/dl y más");
      const interno = area(el, "resultado").shadowRoot.querySelector(
        "textarea",
      );
      interno.setSelectionRange(3, 3);
      el.model = modelo({
        valores: {
          ...modelo().valores,
          a: { resultado: "90 mg/dl y más", interpretacion: "Normal" },
        },
      });
      expect(interno.selectionStart).to.equal(3);
    });

    test("en modo solo lectura los campos quedan readonly", () => {
      const el = mount("ofiuco-exam-results");
      el.model = modelo({ readonly: true });
      expect(area(el, "resultado").hasAttribute("readonly")).to.equal(true);
      expect(area(el, "interpretacion").hasAttribute("readonly")).to.equal(
        true,
      );
    });

    test("un examen que se quitará al guardar queda readonly aunque el paso sea editable", () => {
      const el = mount("ofiuco-exam-results");
      el.model = modelo({
        items: [
          { id: "a", nombre: "Glucosa", tieneResultado: true, quitando: true },
        ],
      });
      expect(area(el, "resultado").hasAttribute("readonly")).to.equal(true);
    });

    test("editable y sin quitar: los campos no son readonly", () => {
      const el = mount("ofiuco-exam-results");
      el.model = modelo();
      expect(area(el, "resultado").hasAttribute("readonly")).to.equal(false);
    });
  });
});
