import TarjetaSimple from "./tarjeta_simple.js";
import Consulta from "../../../entity/consulta.js";
import "./resume_element.js";
import { defineOnce } from "../../core/define-once.js";
import { h } from "../../core/dom.js";

const stylesUrl = new URL(
  "../../../../resources/styles/components/tarjeta_consulta.css",
  import.meta.url,
).href;

export class TarjetaConsulta extends TarjetaSimple {
  #consulta = null;
  #paciente = null;
  #pasos = [];

  #nombreEl;
  #metaPacienteEl;
  #fechaEl;
  #referenciaEl;
  #pasosContenedor;
  #atenderBtn;

  constructor() {
    super();

    this.root.append(
      h("link", { rel: "stylesheet", href: stylesUrl }),
    );

    const topBar = this.root.querySelector(".top-bar");
    const sideInfoDiv = this.root.querySelector(".sideInfo");
    if (topBar && sideInfoDiv && !topBar.contains(sideInfoDiv)) {
      topBar.append(sideInfoDiv);
    }

    this.#nombreEl = h("p", { class: "paciente-nombre" });
    this.#metaPacienteEl = h("span", { class: "paciente-meta" });
    const pacienteBox = h(
      "div",
      { slot: "entity-id", class: "paciente-info" },
      this.#nombreEl,
      this.#metaPacienteEl,
    );

    this.#fechaEl = h("span", { class: "consulta-fecha" });
    this.#referenciaEl = h("span", { class: "consulta-referencia" });
    const consultaBox = h(
      "div",
      { slot: "side-info", class: "consulta-meta" },
      this.#fechaEl,
      this.#referenciaEl,
    );

    this.#pasosContenedor = h("div", {
      slot: "body",
      class: "pasos-lista",
    });

    this.#atenderBtn = h(
      "button",
      { type: "button", slot: "footer", class: "btn-atender" },
      "Atender Consulta",
    );

    this.#atenderBtn.addEventListener("click", () => {
      if (!this.#consulta) return;
      this.dispatchEvent(
        new CustomEvent("ofiuco:consulta-select", {
          detail: {
            consulta: this.#consulta,
            paciente: this.#paciente,
            pasos: this.#pasos,
          },
          bubbles: true,
          composed: true,
        }),
      );
    });

    this.append(
      pacienteBox,
      consultaBox,
      this.#pasosContenedor,
      this.#atenderBtn,
    );
  }

  set datos(valor) {
    if (!valor) return;
    if (valor.consulta) {
      this.#consulta =
        valor.consulta instanceof Consulta
          ? valor.consulta
          : Consulta.desdeJson(valor.consulta);
      this.#paciente = valor.paciente ?? null;
      this.#pasos = Array.isArray(valor.pasos) ? valor.pasos : [];
    } else {
      this.consulta = valor;
      return;
    }
    this.#renderizar();
  }

  set consulta(valor) {
    if (!valor) {
      this.#consulta = null;
      return;
    }
    this.#consulta =
      valor instanceof Consulta ? valor : Consulta.desdeJson(valor);
    this.#renderizar();
  }

  get consulta() {
    return this.#consulta;
  }

  set paciente(valor) {
    this.#paciente = valor ?? null;
    this.#renderizar();
  }

  set pasos(lista) {
    this.#pasos = Array.isArray(lista) ? lista : [];
    this.#renderizar();
  }

  #renderizar() {
    const c = this.#consulta;
    if (!c) return;

    const nombre = this.#paciente?.nombre ?? `Consulta #${c.idCorto}`;
    const partesMeta = [];
    if (this.#paciente?.edad != null) partesMeta.push(`Edad: ${this.#paciente.edad}`);
    if (this.#paciente?.documento) partesMeta.push(`ID: ${this.#paciente.documento}`);
    else partesMeta.push(`Ref: ${c.idCorto}`);

    this.#nombreEl.textContent = nombre;
    this.#metaPacienteEl.textContent = partesMeta.join(" ÔÇó ");

    this.#fechaEl.textContent = this.#formatearFecha(c.fechaInicio);
    this.#referenciaEl.textContent = c.referenciaExterna ?? "";

    this.#pasosContenedor.replaceChildren();
    if (this.#pasos.length === 0) {
      this.#pasosContenedor.append(
        h("p", { class: "pasos-vacio" }, "Sin pasos previos registrados"),
      );
    } else {
      for (const paso of this.#pasos) {
        const el = document.createElement("ofiuco-resume-element");
        el.item = {
          titulo: paso.nombre ?? paso.titulo ?? "Paso",
          subtitulo: paso.responsable ?? paso.subtitulo ?? "",
          fecha: paso.fecha ?? "",
          accion: "Ver Registro",
          estado: "completado",
          registro: paso.registro ?? paso,
        };
        this.#pasosContenedor.append(el);
      }
    }
  }

  #formatearFecha(fecha) {
    if (!(fecha instanceof Date)) return "Sin fecha";
    return fecha.toLocaleString("es-SV", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
}

defineOnce("ofiuco-tarjeta-consulta", TarjetaConsulta);
export default TarjetaConsulta;
