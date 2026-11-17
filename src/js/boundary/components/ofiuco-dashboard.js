import { BaseComponent } from "../core/base-component.js";
import { defineOnce } from "../core/define-once.js";
import { h } from "../core/dom.js";
import DashboardService from "../../control/dashboard_service.js";
import { getPatientName, relationName } from "./utils/consulta-format.js";
import "./functional/ofiuco-date-picker.js";
import "./functional/ofiuco-pagination.js";
import "./layout/consulta_card.js";
import "./layout/consulta_resumen.js";
import "./layout/ofiuco-dialog.js";

const styleUrl = (name) =>
  new URL(`../../../resources/styles/components/${name}`, import.meta.url).href;

export class OfiucoDashboard extends BaseComponent {
  static styleUrls = [styleUrl("button.css"), styleUrl("dashboard.css")];

  constructor() {
    super();
    this.service = new DashboardService();
    this.user = null;
    this.asignaciones = [];
    this.seleccion = null;
    this.consultas = [];
    this.filteredConsultas = [];

    this.loadSequence = 0;

    // Paginación de consultas pendientes
    this.pendingPage = 0;
    this.pendingPageSize = 2;
    this.pendingConsultas = [];

    // Paginación de consultas finalizadas
    this.completedPage = 0;
    this.completedPageSize = 2;
    this.completedConsultas = [];
  }

  render() {
    // Los filtros de fecha empiezan en el día de hoy (fecha local).
    const today = this.service.fechaLocalISO(new Date());

    const assignmentSelect = h("select", { id: "asignacion", "aria-label": "Clínica y rol" });
    const desde = h("ofiuco-date-picker", { id: "desde", label: "Desde", value: today });
    const hasta = h("ofiuco-date-picker", { id: "hasta", label: "Hasta", value: today });
    const search = h("input", { id: "buscarPaciente", type: "search", placeholder: "Nombre o referencia", autocomplete: "off" });
    const status = h("p", { id: "status", class: "status", role: "status", "aria-live": "polite" });
    const pendingCards = h("div", { id: "pendientes", class: "cards" });
    const completedCards = h("div", { id: "finalizadas", class: "cards" });
    const pendingPagination = h("ofiuco-pagination", {
      id: "pending-pagination",
      label: "Paginación de consultas pendientes",
      "page-size": this.pendingPageSize
    });
    const completedPagination = h("ofiuco-pagination", {
      id: "completed-pagination",
      label: "Paginación de consultas finalizadas",
      "page-size": this.completedPageSize
    });

    this.shadowRoot.append(
      h("main", { class: "dashboard-shell" },
        h("header", { class: "dashboard-top" },
          h("div", {},
            h("p", { class: "eyebrow" }, "GalenoSV · Área de trabajo"),
            h("h1", {}, "Mis consultas"),
            h("div", { class: "profile", id: "profile" })
          ),
          h("button", { class: "button secondary", id: "logout", type: "button" }, "Cerrar sesión")
        ),
        h("section", { class: "panel", "aria-label": "Filtros de consultas" },
          h("div", { class: "filters" },
            h("div", { class: "field wide" }, h("label", { for: "asignacion" }, "Clínica y rol"), assignmentSelect),
            h("div", { class: "field" }, desde),
            h("div", { class: "field" }, hasta),
            h("div", { class: "field" }, h("label", { for: "buscarPaciente" }, "Paciente / referencia"), search),
            h("div", { class: "actions" },
              h("button", { class: "button", id: "apply", type: "button" }, "Filtrar"),
              h("button", { class: "button secondary", id: "clear", type: "button" }, "Limpiar")
            )
          )
        ),
        status,
        h("div", { class: "summary-bar" },
          h("h2", {}, "Consultas asignadas"),
          h("span", { class: "summary-count", id: "count" }, "0 consultas")
        ),
        h("section", { class: "columns" },
          h("section", { class: "column pendientes", "aria-labelledby": "pending-title" },
            h("div", { class: "column-heading" },
              h("h2", { id: "pending-title" }, h("span", { class: "dot" }), "Pendientes"),
              h("span", { class: "column-count", id: "pending-count" }, "0")
            ),
            pendingCards,
            pendingPagination
          ),
          h("section", { class: "column finalizadas", "aria-labelledby": "completed-title" },
            h("div", { class: "column-heading" },
              h("h2", { id: "completed-title" }, h("span", { class: "dot" }), "Finalizadas"),
              h("span", { class: "column-count", id: "completed-count" }, "0")
            ),
            completedCards,
            completedPagination
          )
        ),
        h("div", { id: "dialog-root" })
      )
    );

    assignmentSelect.addEventListener("change", () => this.cargar());
    this.shadowRoot.querySelector("#apply").addEventListener("click", () => this.cargar());
    this.shadowRoot.querySelector("#clear").addEventListener("click", () => this.limpiarFiltros());
    this.shadowRoot.querySelector("#logout").addEventListener("click", () => {
      this.dispatchEvent(new CustomEvent("logout-requested", { bubbles: true, composed: true }));
    });

    const columns = this.shadowRoot.querySelector(".columns");
    columns.addEventListener("ofiuco:consulta-resumen", (event) => this.mostrarResumen(event.detail.consulta));
    columns.addEventListener("ofiuco:consulta-select", (event) => this.atender(event.detail.consulta));
    pendingPagination.addEventListener("ofiuco:page-change", (event) => {
      this.pendingPage = event.detail.page;
      this.renderPendingPage();
    });
    completedPagination.addEventListener("ofiuco:page-change", (event) => {
      this.completedPage = event.detail.page;
      this.renderCompletedPage();
    });
    search.addEventListener("keydown", (event) => {
      if (event.key === "Enter") this.cargar();
    });
  }

  setSession(data) {
    this.user = data?.persona ?? null;
    this.asignaciones = Array.isArray(data?.asignaciones) ? data.asignaciones : [];
    if (this.rendered) {
      this.paintProfile();
      this.paintAssignments();
      this.cargar();
    }
  }

  onConnect() {
    if (this.user || this.asignaciones.length) {
      this.paintProfile();
      this.paintAssignments();
      this.cargar();
    }
  }

  paintProfile() {
    const profile = this.shadowRoot.querySelector("#profile");
    if (!profile) return;
    const name = `${this.user?.nombres ?? ""} ${this.user?.apellidos ?? ""}`.trim() || "Empleado";
    profile.replaceChildren(
      h("strong", {}, name),
      h("span", { class: "profile-chip", id: "profile-role" }, "Rol pendiente de selección"),
      h("span", { class: "profile-chip", id: "profile-clinic" }, "Clínica pendiente de selección")
    );
  }

  paintAssignments() {
    const select = this.shadowRoot.querySelector("#asignacion");
    if (!select) return;
    select.replaceChildren(...this.asignaciones.map((assignment, index) => h("option", {
      value: String(index)
    }, `${relationName(assignment.idClinica, "Clínica")} — ${relationName(assignment.idRol, "Rol")}`)));
    if (this.asignaciones.length) select.value = "0";
    this.updateSelectedProfile();
  }

  updateSelectedProfile() {
    const select = this.shadowRoot.querySelector("#asignacion");
    const assignment = this.asignaciones[Number(select?.value ?? 0)] ?? null;
    this.seleccion = assignment;
    const role = this.shadowRoot.querySelector("#profile-role");
    const clinic = this.shadowRoot.querySelector("#profile-clinic");
    if (role) role.textContent = relationName(assignment?.idRol, "Rol no disponible");
    if (clinic) clinic.textContent = relationName(assignment?.idClinica, "Clínica no disponible");
  }

  limpiarFiltros() {
    // "Limpiar" vuelve al estado inicial: fechas en el día de hoy.
    const today = this.service.fechaLocalISO(new Date());
    this.shadowRoot.querySelector("#desde").value = today;
    this.shadowRoot.querySelector("#hasta").value = today;
    this.shadowRoot.querySelector("#buscarPaciente").value = "";
    this.cargar();
  }

  empty(message) {
    return h("div", { class: "empty" }, message);
  }

  showEmpty(container, message) {
    container.replaceChildren(this.empty(message));
  }

  resetPagination() {
    this.pendingPage = 0;
    this.completedPage = 0;
    this.pendingConsultas = [];
    this.completedConsultas = [];
    this.shadowRoot.querySelector("#pending-pagination").total = 0;
    this.shadowRoot.querySelector("#completed-pagination").total = 0;
  }

  async cargar() {
    const sequence = ++this.loadSequence;
    this.updateSelectedProfile();
    const status = this.shadowRoot.querySelector("#status");
    const pending = this.shadowRoot.querySelector("#pendientes");
    const completed = this.shadowRoot.querySelector("#finalizadas");
    const count = this.shadowRoot.querySelector("#count");
    const pendingCount = this.shadowRoot.querySelector("#pending-count");
    const completedCount = this.shadowRoot.querySelector("#completed-count");

    const desde = this.shadowRoot.querySelector("#desde").value;
    const hasta = this.shadowRoot.querySelector("#hasta").value;
    if (desde && hasta && desde > hasta) {
      status.textContent = "La fecha inicial no puede ser posterior a la fecha final.";
      return;
    }

    if (!this.seleccion?.idPersonaRol) {
      this.consultas = [];
      this.resetPagination();
      this.showEmpty(pending, "No tiene asignaciones de clínica y rol disponibles.");
      this.showEmpty(completed, "No hay consultas finalizadas.");
      count.textContent = "0 consultas";
      pendingCount.textContent = "0";
      completedCount.textContent = "0";
      status.textContent = "";
      return;
    }

    status.textContent = "Cargando consultas…";
    pending.replaceChildren();
    completed.replaceChildren();

    try {
      const consultas = await this.service.obtenerConsultas(this.seleccion.idPersonaRol, { desde, hasta });
      if (sequence !== this.loadSequence) return;
      this.consultas = Array.isArray(consultas) ? consultas : [];
      this.aplicarFiltroLocal();
      status.textContent = "";
    } catch (error) {
      if (sequence !== this.loadSequence) return;
      this.consultas = [];
      this.filteredConsultas = [];
      this.resetPagination();
      this.showEmpty(pending, "No se pudieron cargar las consultas.");
      this.showEmpty(completed, "No se pudieron cargar las consultas.");
      status.textContent = `No fue posible cargar las consultas: ${error.message}`;
      count.textContent = "0 consultas";
      pendingCount.textContent = "0";
      completedCount.textContent = "0";
    }
  }

  aplicarFiltroLocal() {
    const query = this.shadowRoot.querySelector("#buscarPaciente").value.trim().toLocaleLowerCase();

    this.filteredConsultas = this.consultas.filter((consulta) => {
      if (!query) return true;

      const haystack = [
        getPatientName(consulta),
        consulta.referenciaExterna,
        consulta.idConsulta
      ].filter(Boolean).join(" ").toLocaleLowerCase();

      return haystack.includes(query);
    });

    this.pendingConsultas = this.filteredConsultas.filter((consulta) => !consulta.fechaFin);
    this.completedConsultas = this.filteredConsultas.filter((consulta) => Boolean(consulta.fechaFin));

    // Reiniciar ambas paginaciones al aplicar filtros.
    this.pendingPage = 0;
    this.completedPage = 0;

    this.renderPendingPage();
    this.renderCompletedPage();

    this.shadowRoot.querySelector("#count").textContent =
      `${this.filteredConsultas.length} ${this.filteredConsultas.length === 1 ? "consulta" : "consultas"}`;
    this.shadowRoot.querySelector("#pending-count").textContent = String(this.pendingConsultas.length);
    this.shadowRoot.querySelector("#completed-count").textContent = String(this.completedConsultas.length);
  }

  renderPendingPage() {
    this.pendingPage = this.paintColumn({
      cards: this.shadowRoot.querySelector("#pendientes"),
      pagination: this.shadowRoot.querySelector("#pending-pagination"),
      items: this.pendingConsultas,
      page: this.pendingPage,
      pageSize: this.pendingPageSize,
      emptyMessage: "No hay consultas pendientes con estos filtros."
    });
  }

  renderCompletedPage() {
    this.completedPage = this.paintColumn({
      cards: this.shadowRoot.querySelector("#finalizadas"),
      pagination: this.shadowRoot.querySelector("#completed-pagination"),
      items: this.completedConsultas,
      page: this.completedPage,
      pageSize: this.completedPageSize,
      emptyMessage: "No hay consultas finalizadas con estos filtros."
    });
  }

  /** Pinta una página de tarjetas y sincroniza su paginador. Devuelve la página efectiva. */
  paintColumn({ cards, pagination, items, page, pageSize, emptyMessage }) {
    if (!cards || !pagination) return page;

    const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
    const current = Math.min(Math.max(0, page), pageCount - 1);
    const start = current * pageSize;
    const visible = items.slice(start, start + pageSize);

    cards.replaceChildren(...(visible.length
      ? visible.map((consulta) => this.card(consulta))
      : [this.empty(emptyMessage)]));

    pagination.pageSize = pageSize;
    pagination.total = items.length;
    pagination.page = current;
    return current;
  }

  card(consulta) {
    const card = h("ofiuco-consulta-card");
    card.consulta = consulta;
    return card;
  }

  atender(consulta) {
    if (!consulta) return;
    this.dispatchEvent(new CustomEvent("consulta-selected", {
      detail: { consulta, asignacion: this.seleccion }, bubbles: true, composed: true
    }));
  }

  mostrarResumen(consulta) {
    if (!consulta) return;
    const root = this.shadowRoot.querySelector("#dialog-root");

    const resumen = h("ofiuco-consulta-resumen");
    resumen.consulta = consulta;
    resumen.service = this.service;

    const dialog = h("ofiuco-dialog", {
      eyebrow: "Resumen de consulta",
      heading: consulta.referenciaExterna || consulta.idConsulta || "Consulta"
    }, resumen);
    dialog.addEventListener("ofiuco:dialog-close", () => root.replaceChildren());

    root.replaceChildren(dialog);
  }
}

defineOnce("ofiuco-dashboard", OfiucoDashboard);
