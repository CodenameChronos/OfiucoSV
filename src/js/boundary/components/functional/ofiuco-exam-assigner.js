/**
 * @fileoverview Web Component presentacional `<ofiuco-exam-assigner>` para el panel
 * "Asignar exámenes". Permite buscar y seleccionar exámenes desde un catálogo mediante
 * `<ofiuco-auto-complete>`, visualizar la lista de exámenes asignados (indicando cuáles
 * están pendientes de guardar) y emitir eventos para agregar o quitar elementos.
 */

import { BaseComponent } from "../../core/base-component.js";
import { defineOnce } from "../../core/define-once.js";
import { h } from "../../core/dom.js";
import { ConsultaEventos } from "../../core/eventos-consulta.js";
import "../functional/ofiuco-remove-exam-button.js";
import "../primitives/ofiuco-auto-complete.js";

/** @type {string} URL resuelta de la hoja de estilos asociada al asignador de exámenes. */
const stylesUrl = new URL(
  "../../../../resources/styles/components/exam_assigner.css",
  import.meta.url,
).href;

/**
 * <ofiuco-exam-assigner>
 *
 * Panel "Asignar exámenes": buscador (AutoComplete) del catálogo del paso y
 * lista de la selección actual con su botón de quitar.
 *
 * Presentacional: recibe `model` (ver modeloAsignador en examenes_consulta.js)
 *   { catalogo: [{ id, nombre, ordenado }], seleccion: [id], readonly }
 * y emite:
 *   - EXAMEN_AGREGADO  { id }           al elegir una opción del buscador
 *   - QUITAR_EXAMEN    { value: id }    desde el botón de cada examen
 *
 * La selección es el BORRADOR: puede incluir exámenes aún no guardados, que se
 * marcan "Pendiente de guardar" (ordenado === false).
 * @extends BaseComponent
 * @fires CustomEvent#ConsultaEventos.EXAMEN_AGREGADO
 * @fires CustomEvent#ConsultaEventos.QUITAR_EXAMEN
 */
export class OfiucoExamAssigner extends BaseComponent {
  /**
   * Hojas de estilo cargadas en el Shadow DOM del componente.
   * @type {string[]}
   */
  static styleUrls = [stylesUrl];

  #model = null;
  #buscador;
  #lista;
  #vacio;

  get model() {
    return this.#model;
  }

  set model(valor) {
    this.#model = valor ?? null;
    if (this.rendered) this.#sincronizar();
  }

  /**
   * Construye la estructura DOM del panel dentro del Shadow DOM, configura el buscador
   * y aísla los eventos internos del autocompletado para despachar únicamente el evento
   * de dominio `ConsultaEventos.EXAMEN_AGREGADO`.
   */
  render() {
    this.#buscador = h("ofiuco-auto-complete", {
      label: "Buscar examen",
      placeholder: "Buscar...",
      "min-chars": "0",
      "max-results": "8",
    });
    // Los eventos del buscador no deben filtrarse a la página.
    this.#buscador.addEventListener("value-changed", (evento) =>
      evento.stopPropagation(),
    );
    this.#buscador.addEventListener("option-selected", (evento) => {
      evento.stopPropagation();
      this.dispatchEvent(
        new CustomEvent(ConsultaEventos.EXAMEN_AGREGADO, {
          detail: { id: evento.detail.value },
          bubbles: true,
          composed: true,
        }),
      );
      this.#buscador.value = "";
    });

    this.#lista = h("ul", {
      class: "asignados",
      "aria-label": "Exámenes asignados",
    });
    this.#vacio = h("p", { class: "vacio" }, "Sin exámenes asignados.");

    this.shadowRoot.append(
      h(
        "section",
        { class: "asignador" },
        h("h2", { class: "titulo" }, "Asignar exámenes"),
        this.#buscador,
        this.#lista,
        this.#vacio,
      ),
    );
    this.#sincronizar();
  }

  /**
   * Actualiza la interfaz interna del componente a partir del estado de `#model`:
   * - Filtra del buscador los exámenes que ya forman parte de la selección y ajusta su estado `readonly`.
   * - Construye la lista de exámenes asignados (incluyendo respaldos si algún ID ya no figura en el catálogo).
   * - Muestra el indicador `"Pendiente de guardar"` cuando `ordenado` es falso y alterna el mensaje de lista vacía.
   */
  #sincronizar() {
    const modelo = this.#model;
    const catalogo = modelo?.catalogo ?? [];
    const seleccion = new Set(modelo?.seleccion ?? []);
    const soloLectura = Boolean(modelo?.readonly);

    this.#buscador.options = catalogo
      .filter((examen) => !seleccion.has(examen.id))
      .map((examen) => ({ value: examen.id, label: examen.nombre }));
    this.#buscador.disabled = soloLectura;
    this.#buscador.hidden = soloLectura;

    const conocidos = new Set(catalogo.map((examen) => examen.id));
    const asignados = [
      ...catalogo.filter((examen) => seleccion.has(examen.id)),
      // Ids de la selección que ya no están en el catálogo: se muestran igual.
      ...[...seleccion]
        .filter((id) => !conocidos.has(id))
        .map((id) => ({ id, nombre: "Examen", ordenado: false })),
    ];

    this.#lista.replaceChildren(
      ...asignados.map((examen) =>
        h(
          "li",
          { class: "asignado" },
          h("span", { class: "asignado__nombre" }, examen.nombre ?? "Examen"),
          examen.ordenado
            ? ""
            : h(
                "span",
                { class: "asignado__pendiente" },
                "Pendiente de guardar",
              ),
          soloLectura
            ? ""
            : h("ofiuco-remove-exam-button", {
                value: examen.id,
                label: `Quitar ${examen.nombre ?? "examen"}`,
              }),
        ),
      ),
    );
    this.#vacio.hidden = asignados.length > 0;
  }
}

defineOnce("ofiuco-exam-assigner", OfiucoExamAssigner);
export default OfiucoExamAssigner;