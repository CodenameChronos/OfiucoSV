import { BaseComponent } from "../../core/base-component.js";
import { defineOnce } from "../../core/define-once.js";
import { h } from "../../core/dom.js";
import { ConsultaEventos } from "../../core/eventos-consulta.js";
// Ajustar la ruta a la carpeta real de OfiucoTextArea.
import "../primitives/ofiuco-text-area.js";

const stylesUrl = new URL(
  "../../../../resources/styles/components/exam_results.css",
  import.meta.url,
).href;

const MENSAJE_ASIGNAR = "Asigne un examen para registrar su resultado.";
const MENSAJE_GUARDAR =
  "Guarde los cambios para registrar los resultados de los exámenes asignados.";

const CAMPOS = [
  {
    campo: "resultado",
    label: "Resultado",
    placeholder: "Datos técnicos (p. ej. presión arterial 140/90)",
  },
  {
    campo: "interpretacion",
    label: "Interpretación",
    placeholder: "Explicación en lenguaje sencillo para el paciente",
  },
];

/**
 * <ofiuco-exam-results>
 *
 * Selector de exámenes ORDENADOS (lista izquierda) y los campos "Resultado" e
 * "Interpretación" del examen seleccionado.
 *
 * Presentacional: recibe `model` (ver modeloResultados en examenes_consulta.js)
 *   { items: [{ id, nombre, tieneResultado, quitando }], seleccionado,
 *     valores: { [id]: { resultado, interpretacion } }, pendientes, readonly }
 * y emite:
 *   - EXAMEN_SELECCIONADO  { id }                      (clic o teclado)
 *   - RESULTADO_CAMBIADO   { id, campo, valor }        (al escribir)
 * La página actualiza el borrador y vuelve a asignar el modelo.
 *
 * La lista es un listbox accesible: flechas, Inicio y Fin cambian la selección.
 */
export class OfiucoExamResults extends BaseComponent {
  static styleUrls = [stylesUrl];

  #model = null;
  #baseId;
  #lista;
  #vacio;
  #detalle;
  #campos = new Map();

  get model() {
    return this.#model;
  }

  set model(valor) {
    this.#model = valor ?? null;
    if (this.rendered) this.#sincronizar();
  }

  render() {
    this.#baseId = `ofiuco-er-${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;

    this.#lista = h("ul", {
      class: "lista",
      role: "listbox",
      tabindex: "0",
      "aria-label": "Exámenes ordenados",
    });
    this.#lista.addEventListener("click", (evento) => {
      const item = evento.target.closest("li[data-id]");
      if (item) this.#seleccionar(item.dataset.id);
    });
    this.#lista.addEventListener("keydown", (evento) => this.#teclado(evento));

    this.#vacio = h("p", { class: "vacio", role: "status" });

    const campos = CAMPOS.map(({ campo, label, placeholder }) => {
      const area = h("ofiuco-text-area", {
        label,
        placeholder,
        rows: "5",
        "data-campo": campo,
      });
      // El evento interno no debe filtrarse a la página: se re-emite con el contrato propio.
      area.addEventListener("value-changed", (evento) => {
        evento.stopPropagation();
        this.#cambio(campo, evento.detail.value);
      });
      this.#campos.set(campo, area);
      return area;
    });
    this.#detalle = h("div", { class: "detalle" }, ...campos);

    this.shadowRoot.append(
      h(
        "div",
        { class: "exam-results" },
        this.#lista,
        this.#vacio,
        this.#detalle,
      ),
    );
    this.#sincronizar();
  }

  #sincronizar() {
    const modelo = this.#model;
    const items = modelo?.items ?? [];
    const seleccionado =
      items.find((i) => i.id === modelo?.seleccionado) ?? null;

    this.#lista.replaceChildren(
      ...items.map((item) => this.#crearItem(item, item === seleccionado)),
    );
    this.#lista.hidden = items.length === 0;
    if (seleccionado) {
      this.#lista.setAttribute(
        "aria-activedescendant",
        this.#idItem(seleccionado.id),
      );
    } else {
      this.#lista.removeAttribute("aria-activedescendant");
    }

    this.#vacio.hidden = items.length > 0;
    this.#vacio.textContent =
      (modelo?.pendientes ?? 0) > 0 ? MENSAJE_GUARDAR : MENSAJE_ASIGNAR;

    this.#detalle.hidden = seleccionado === null;
    if (seleccionado) {
      for (const [campo, area] of this.#campos) {
        const valor = modelo.valores?.[seleccionado.id]?.[campo] ?? "";
        // No reasignar si ya coincide: evita saltos del cursor mientras se escribe.
        if (area.value !== valor) area.value = valor;
        area.toggleAttribute(
          "readonly",
          Boolean(modelo.readonly) || seleccionado.quitando,
        );
      }
    }
  }

  #idItem(id) {
    return `${this.#baseId}-${id}`;
  }

  #crearItem(item, activo) {
    return h(
      "li",
      {
        id: this.#idItem(item.id),
        class: activo ? "item item--activo" : "item",
        role: "option",
        "aria-selected": String(activo),
        "data-id": item.id,
      },
      h("span", { class: "item__nombre" }, item.nombre ?? "Examen"),
      item.tieneResultado
        ? h(
            "span",
            { class: "item__marca" },
            h("span", { "aria-hidden": "true" }, "✓"),
            h("span", { class: "solo-lectores" }, " con resultado"),
          )
        : "",
      item.quitando
        ? h("span", { class: "item__aviso" }, "Se quitará al guardar")
        : "",
    );
  }

  #teclado(evento) {
    const ids = (this.#model?.items ?? []).map((i) => i.id);
    if (ids.length === 0) return;

    const actual = ids.indexOf(this.#model.seleccionado);
    let destino;
    if (evento.key === "ArrowDown")
      destino = Math.min(ids.length - 1, actual + 1);
    else if (evento.key === "ArrowUp") destino = Math.max(0, actual - 1);
    else if (evento.key === "Home") destino = 0;
    else if (evento.key === "End") destino = ids.length - 1;
    else return;

    evento.preventDefault();
    if (destino !== actual) this.#seleccionar(ids[destino]);
  }

  #seleccionar(id) {
    if (id === this.#model?.seleccionado) return;
    this.#emitir(ConsultaEventos.EXAMEN_SELECCIONADO, { id });
  }

  #cambio(campo, valor) {
    const id = this.#model?.seleccionado;
    if (!id) return;
    this.#emitir(ConsultaEventos.RESULTADO_CAMBIADO, { id, campo, valor });
  }

  #emitir(nombre, detail) {
    this.dispatchEvent(
      new CustomEvent(nombre, { detail, bubbles: true, composed: true }),
    );
  }
}

defineOnce("ofiuco-exam-results", OfiucoExamResults);
export default OfiucoExamResults;
