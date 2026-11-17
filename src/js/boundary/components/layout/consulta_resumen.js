import { BaseComponent } from "../../core/base-component.js";
import { defineOnce } from "../../core/define-once.js";
import { h } from "../../core/dom.js";
import DashboardService from "../../../control/dashboard_service.js";
import { formatDate, getPatientName, relationName } from "../utils/consulta-format.js";
import "../primitives/simple_info.js";
import "./resume_element.js";

const stylesUrl = new URL(
  "../../../../resources/styles/components/consulta_resumen.css",
  import.meta.url,
).href;

export class OfiucoConsultaResumen extends BaseComponent {
  static styleUrls = [stylesUrl];

  #consulta = null;
  #service = null;
  #container;

  get consulta() {
    return this.#consulta;
  }

  set consulta(value) {
    this.#consulta = value ?? null;
    if (this.rendered) this.#paint();
  }

  get service() {
    this.#service ??= new DashboardService();
    return this.#service;
  }

  set service(value) {
    this.#service = value ?? null;
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
    this.#container.replaceChildren(
      this.#general(consulta),
      ...this.#procedimientos(consulta)
    );
  }

  #info(etiqueta, valor) {
    return h("ofiuco-simple-info", { etiqueta, valor: String(valor) });
  }

  #general(consulta) {
    return h("section", { class: "detail-section" },
      h("h3", {}, "Información general"),
      h("div", { class: "info-grid" },
        this.#info("Paciente", getPatientName(consulta)),
        this.#info("Inicio", formatDate(consulta.fechaInicio)),
        this.#info("Fin", formatDate(consulta.fechaFin)),
        this.#info("Estado", consulta.fechaFin ? "Finalizada" : "Pendiente"),
        this.#info("Observaciones", consulta.observaciones || "Sin observaciones")
      )
    );
  }

  #procedimientos(consulta) {
    const procedimientos = consulta.procedimientos ?? [];
    if (!procedimientos.length) {
      return [h("div", { class: "empty" }, "Esta consulta no tiene procedimientos asociados.")];
    }

    return procedimientos.map((procedimiento) => {
      const pasos = (procedimiento.pasos ?? []).map((paso) => this.#paso(procedimiento, paso));
      return h("section", { class: "detail-section" },
        h("h3", {}, relationName(procedimiento.idProcedimiento, "Procedimiento")),
        ...(pasos.length ? pasos : [h("p", { class: "muted" }, "Sin pasos registrados.")])
      );
    });
  }

  #paso(procedimiento, paso) {
    const empleado = paso.idPersonaRol?.nombreCompleto
      ?? [paso.idPersonaRol?.idPersona?.nombres, paso.idPersonaRol?.idPersona?.apellidos].filter(Boolean).join(" ")
      ?? "";

    const detalle = [
      `Estado: ${paso.estado ?? "No especificado"}`,
      `Realizado por: ${empleado || "No especificado"}`
    ];
    if (paso.fechaFin) detalle.push(`Fin: ${formatDate(paso.fechaFin)}`);

    const elemento = h("ofiuco-resume-element");
    elemento.item = {
      titulo: relationName(paso.idProcedimientoPaso, "Paso"),
      subtitulo: detalle.join(" · "),
      fecha: formatDate(paso.fechaInicio),
      accion: "Ver registro",
      estado: paso.fechaFin ? "completado" : "pendiente"
    };

    const salida = h("div", { class: "record" });
    const contenedor = h("div", { class: "step" }, elemento, salida);

    // ofiuco-resume-element avisa con este evento; el resumen lo atiende aquí.
    contenedor.addEventListener("ofiuco:resume-ver-registro", (event) => {
      event.stopPropagation();
      this.#verRegistro(salida, procedimiento.idConsultaProcedimiento, paso.idConsultaProcedimientoPaso);
    });

    return contenedor;
  }

  async #verRegistro(salida, idProcedimiento, idPaso) {
    if (salida.getAttribute("aria-busy") === "true") return;
    salida.setAttribute("aria-busy", "true");
    salida.textContent = "Consultando registro…";
    try {
      const record = await this.service.obtenerDetallePaso(idProcedimiento, idPaso);
      const orders = record?.ordenExamenList ?? [];
      salida.textContent = record?.observaciones || record?.resultado || (orders.length
        ? JSON.stringify(orders, null, 2)
        : "No hay observaciones ni resultados registrados.");
    } catch (error) {
      salida.textContent = `No se pudo consultar el registro: ${error.message}`;
    } finally {
      salida.removeAttribute("aria-busy");
    }
  }
}

defineOnce("ofiuco-consulta-resumen", OfiucoConsultaResumen);
export default OfiucoConsultaResumen;
