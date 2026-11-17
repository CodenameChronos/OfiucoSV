import { BaseComponent } from "../../core/base-component.js";
import { defineOnce } from "../../core/define-once.js";
import { h } from "../../core/dom.js";
import { formatDate, getPatientName } from "../utils/consulta-format.js";
import "../primitives/simple_info.js";

const styleUrl = (name) =>
  new URL(`../../../../resources/styles/components/${name}`, import.meta.url).href;

export class OfiucoConsultaCard extends BaseComponent {
  static styleUrls = [styleUrl("button.css"), styleUrl("consulta_card.css")];

  #consulta = null;
  #container;

  get consulta() {
    return this.#consulta;
  }

  set consulta(value) {
    this.#consulta = value ?? null;
    if (this.rendered) this.#paint();
  }

  render() {
    this.#container = h("div");
    this.shadowRoot.append(this.#container);
    this.#paint();
  }

  #paint() {
    const consulta = this.#consulta;
    if (!consulta) {
      this.#container.replaceChildren();
      return;
    }

    const finished = Boolean(consulta.fechaFin);
    const reference = consulta.referenciaExterna || consulta.idConsulta?.slice?.(0, 8) || "Sin referencia";
    const procedures = Array.isArray(consulta.procedimientos) ? consulta.procedimientos.length : 0;

    const summaryButton = h("button", { class: "button secondary", type: "button" }, "Ver resumen");
    summaryButton.addEventListener("click", () => this.#emit("ofiuco:consulta-resumen"));

    const actions = h("div", { class: "card-actions" }, summaryButton);
    if (!finished) {
      const attendButton = h("button", { class: "button", type: "button" }, "Atender consulta");
      attendButton.addEventListener("click", () => this.#emit("ofiuco:consulta-select"));
      actions.append(attendButton);
    }

    const meta = h("div", { class: "card-meta" },
      h("ofiuco-simple-info", { etiqueta: "Paciente", valor: getPatientName(consulta) }),
      h("ofiuco-simple-info", { etiqueta: "Inicio", valor: formatDate(consulta.fechaInicio) })
    );
    if (finished) {
      meta.append(h("ofiuco-simple-info", { etiqueta: "Finalización", valor: formatDate(consulta.fechaFin) }));
    }
    meta.append(h("ofiuco-simple-info", { etiqueta: "Procedimientos", valor: String(procedures) }));

    this.#container.replaceChildren(
      h("article", { class: "consultation-card" },
        h("div", { class: "card-top" },
          h("h3", { class: "card-reference" }, `Consulta ${reference}`),
          h("span", { class: finished ? "state done" : "state" }, finished ? "Finalizada" : "Pendiente")
        ),
        meta,
        actions
      )
    );
  }

  #emit(name) {
    this.dispatchEvent(new CustomEvent(name, {
      detail: { consulta: this.#consulta }, bubbles: true, composed: true
    }));
  }
}

defineOnce("ofiuco-consulta-card", OfiucoConsultaCard);
export default OfiucoConsultaCard;
