import { BaseComponent } from "../../core/base-component.js";
import { defineOnce } from "../../core/define-once.js";
import { h } from "../../core/dom.js";

/**
 * <tarjeta-cita>
 * Tarjeta de consulta/cita médica para la vista de búsqueda de paciente (HU1).
 * Muestra fecha (dd/MM/yyyy), hora (hh:mm AM/PM), clínica, procedimientos
 * parseados del campo Observaciones y botón de acción para el ticket.
 */
export class TarjetaCita extends BaseComponent {
  static styleUrls = [
    new URL(
      "../../../../resources/styles/components/tarjeta_cita.css",
      import.meta.url,
    ).href,
  ];

  #consulta = null;
  #clinicaNombre = "";
  #fechaEl;
  #horaEl;
  #clinicaEl;
  #procedimientosEl;
  #procedimientos = [];

  get consulta() {
    return this.#consulta;
  }

  set consulta(value) {
    this.#consulta = value ?? null;
    if (this.rendered) this.#pintar();
  }

  get clinicaNombre() {
    return this.#clinicaNombre;
  }

  set clinicaNombre(value) {
    this.#clinicaNombre = String(value ?? "");
    if (this.rendered) this.#pintar();
  }

  get procedimientos() {
    return this.#procedimientos;
  }

  set procedimientos(value) {
    this.#procedimientos = Array.isArray(value) ? value : [];
    if (this.rendered) this.#pintar();
  }

  render() {
    this.#fechaEl = h("span", { class: "cita-fecha" });
    this.#horaEl = h("span", { class: "cita-hora" });
    this.#clinicaEl = h("p", { class: "cita-clinica" });
    this.#procedimientosEl = h("div", { class: "cita-procedimientos" });

    const btnTicket = h(
      "button",
      {
        type: "button",
        class: "btn-ticket",
        "aria-label": "Descargar ticket de cita",
      },
      "Ticket",
    );

    btnTicket.addEventListener("click", () => {
      if (!this.#consulta) return;
      this.dispatchEvent(
        new CustomEvent("descargar-ticket", {
          bubbles: true,
          composed: true,
          detail: { consulta: this.#consulta },
        }),
      );
    });

    this.shadowRoot.append(
      h(
        "article",
        { class: "cita-card" },
        h("header", { class: "cita-encabezado" }, this.#fechaEl, this.#horaEl),
        h(
          "div",
          { class: "cita-cuerpo" },
          this.#clinicaEl,
          this.#procedimientosEl,
        ),
        h("footer", { class: "cita-pie" }, btnTicket),
      ),
    );

    this.#pintar();
  }

  #pintar() {
    const c = this.#consulta;
    if (!c) return;

    this.#fechaEl.textContent = TarjetaCita.formatearFecha(c.fechaInicio);
    this.#horaEl.textContent = TarjetaCita.formatearHora(c.fechaInicio);

    const nombreClinica =
      this.#clinicaNombre ||
      c.clinica?.nombreClinica ||
      c.clinica?.nombre ||
      "Clínica asignada";
    this.#clinicaEl.textContent = nombreClinica;

    const nombres = this.#procedimientos;
    if (nombres.length === 0) {
      this.#procedimientosEl.replaceChildren(
        h(
          "p",
          { class: "procedimientos-vacio" },
          "Sin procedimientos registrados",
        ),
      );
      return;
    }

    const lista = h(
      "ul",
      { class: "procedimientos-lista" },
      ...nombres.map((nombre) =>
        h(
          "li",
          { class: "procedimiento-item" },
          h("span", { class: "procedimiento-titulo" }, nombre),
        ),
      ),
    );

    this.#procedimientosEl.replaceChildren(lista);
  }

  static formatearFecha(fecha) {
    if (!(fecha instanceof Date) || Number.isNaN(fecha.getTime())) {
      return "--/--/----";
    }
    const dia = String(fecha.getDate()).padStart(2, "0");
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    const anio = fecha.getFullYear();
    return `${dia}/${mes}/${anio}`;
  }

  static formatearHora(fecha) {
    if (!(fecha instanceof Date) || Number.isNaN(fecha.getTime())) {
      return "--:--";
    }
    let horas = fecha.getHours();
    const minutos = String(fecha.getMinutes()).padStart(2, "0");
    const periodo = horas >= 12 ? "PM" : "AM";
    horas = horas % 12 || 12;
    return `${String(horas).padStart(2, "0")}:${minutos} ${periodo}`;
  }
}

defineOnce("tarjeta-cita", TarjetaCita);

export default TarjetaCita;
