import { BaseComponent } from "../core/base-component.js";
import { defineOnce } from "../core/define-once.js";
import { h } from "../core/dom.js";
import DashboardService from "../../control/dashboard_service.js";

const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[character]));

const relationName = (value, fallback) => {
  if (typeof value === "string") return value;
  return value?.nombre ?? value?.descripcion ?? fallback;
};

const formatDate = (value) => {
  if (!value) return "Sin fecha";
  const parsed = new Date(String(value).replace(/\[UTC\]$/, ""));
  return Number.isNaN(parsed.getTime()) ? "Fecha no válida" : parsed.toLocaleString("es-SV", {
    dateStyle: "medium", timeStyle: "short"
  });
};

const getPatientName = (consultation) => {
  const patient = consultation?.paciente ?? consultation?.idPaciente ?? consultation?.persona ?? null;
  const fullName = [patient?.nombres, patient?.apellidos].filter(Boolean).join(" ").trim();
  return fullName || consultation?.nombrePaciente || "No disponible en los datos del API";
};

export class OfiucoDashboard extends BaseComponent {
  static styleUrls = [
    new URL("../../../resources/styles/components/dashboard.css", import.meta.url).href
  ];

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
    const assignmentSelect = h("select", { id: "asignacion", "aria-label": "Clínica y rol" });
    const desde = h("input", { id: "desde", type: "date" });
    const hasta = h("input", { id: "hasta", type: "date" });
    const search = h("input", { id: "buscarPaciente", type: "search", placeholder: "Nombre o referencia", autocomplete: "off" });
    const status = h("p", { id: "status", class: "status", role: "status", "aria-live": "polite" });
    const pendingCards = h("div", { id: "pendientes", class: "cards" });
    const completedCards = h("div", { id: "finalizadas", class: "cards" });

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
            h("div", { class: "field" }, h("label", { for: "desde" }, "Desde"), desde),
            h("div", { class: "field" }, h("label", { for: "hasta" }, "Hasta"), hasta),
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
            h("nav", {
              class: "pagination",
              id: "pending-pagination",
              "aria-label": "Paginación de consultas pendientes"
            })
          ),
          h("section", { class: "column finalizadas", "aria-labelledby": "completed-title" },
            h("div", { class: "column-heading" },
              h("h2", { id: "completed-title" }, h("span", { class: "dot" }), "Finalizadas"),
              h("span", { class: "column-count", id: "completed-count" }, "0")
            ), completedCards,
            h("nav", { class: "pagination", id: "completed-pagination", "aria-label": "Paginación de consultas finalizadas" })
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
    this.shadowRoot.querySelector(".columns").addEventListener("click", (event) => this.onCardAction(event));
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
    this.shadowRoot.querySelector("#desde").value = "";
    this.shadowRoot.querySelector("#hasta").value = "";
    this.shadowRoot.querySelector("#buscarPaciente").value = "";
    this.cargar();
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
      this.completedConsultas = [];
      this.completedPage = 0;
      this.shadowRoot.querySelector("#completed-pagination").replaceChildren();
      pending.innerHTML = '<div class="empty">No tiene asignaciones de clínica y rol disponibles.</div>';
      completed.innerHTML = '<div class="empty">No hay consultas finalizadas.</div>';
      count.textContent = "0 consultas";
      pendingCount.textContent = "0";
      completedCount.textContent = "0";
      status.textContent = "";
      return;
    }

    status.textContent = "Cargando consultas…";
    pending.innerHTML = "";
    completed.innerHTML = "";

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
      this.completedConsultas = [];
      this.completedPage = 0;
      this.shadowRoot.querySelector("#completed-pagination").replaceChildren();
      pending.innerHTML = '<div class="empty">No se pudieron cargar las consultas.</div>';
      completed.innerHTML = '<div class="empty">No se pudieron cargar las consultas.</div>';
      status.textContent = `No fue posible cargar las consultas: ${error.message}`;
      count.textContent = "0 consultas";
      pendingCount.textContent = "0";
      completedCount.textContent = "0";
    }
  }

  aplicarFiltroLocal() {
    const query = this.shadowRoot.querySelector("#buscarPaciente").value.trim().toLocaleLowerCase();

    this.filteredConsultas = this.consultas
      .map((consulta, originalIndex) => ({ consulta, originalIndex }))
      .filter(({ consulta }) => {
        if (!query) return true;

        const haystack = [
          getPatientName(consulta),
          consulta.referenciaExterna,
          consulta.idConsulta
        ].filter(Boolean).join(" ").toLocaleLowerCase();

        return haystack.includes(query);
      });

    this.pendingConsultas = this.filteredConsultas.filter(
      ({ consulta }) => !consulta.fechaFin
    );

    this.completedConsultas = this.filteredConsultas.filter(
      ({ consulta }) => Boolean(consulta.fechaFin)
    );

    // Reiniciar ambas paginaciones al aplicar filtros.
    this.pendingPage = 0;
    this.completedPage = 0;

    this.renderPendingPage();
    this.renderCompletedPage();

    this.shadowRoot.querySelector("#count").textContent =
      `${this.filteredConsultas.length} ${this.filteredConsultas.length === 1 ? "consulta" : "consultas"}`;

    this.shadowRoot.querySelector("#pending-count").textContent =
      String(this.pendingConsultas.length);

    this.shadowRoot.querySelector("#completed-count").textContent =
      String(this.completedConsultas.length);
  }

  renderPendingPage() {
    const cards = this.shadowRoot.querySelector("#pendientes");
    const pagination = this.shadowRoot.querySelector("#pending-pagination");

    if (!cards || !pagination) return;

    const total = this.pendingConsultas.length;
    const pageCount = Math.max(1, Math.ceil(total / this.pendingPageSize));

    this.pendingPage = Math.min(
      Math.max(0, this.pendingPage),
      pageCount - 1
    );

    const start = this.pendingPage * this.pendingPageSize;

    const visible = this.pendingConsultas.slice(
      start,
      start + this.pendingPageSize
    );

    cards.innerHTML = visible.map((item) => this.card(item)).join("")
      || '<div class="empty">No hay consultas pendientes con estos filtros.</div>';

    if (total <= this.pendingPageSize) {
      pagination.replaceChildren();
      return;
    }

    pagination.innerHTML = `
    <span class="pagination-info">
      Mostrando ${start + 1}–${Math.min(start + this.pendingPageSize, total)} de ${total}
    </span>

    <div class="pagination-actions">
      <button
        class="button secondary"
        type="button"
        data-pending-page="previous"
        ${this.pendingPage === 0 ? "disabled" : ""}
      >
        Anterior
      </button>

      <span class="pagination-current">
        Página ${this.pendingPage + 1} de ${pageCount}
      </span>

      <button
        class="button secondary"
        type="button"
        data-pending-page="next"
        ${this.pendingPage >= pageCount - 1 ? "disabled" : ""}
      >
        Siguiente
      </button>
    </div>
  `;
  }

  renderCompletedPage() {
    const cards = this.shadowRoot.querySelector("#finalizadas");
    const pagination = this.shadowRoot.querySelector("#completed-pagination");
    if (!cards || !pagination) return;

    const total = this.completedConsultas.length;
    const pageCount = Math.max(1, Math.ceil(total / this.completedPageSize));
    this.completedPage = Math.min(Math.max(0, this.completedPage), pageCount - 1);
    const start = this.completedPage * this.completedPageSize;
    const visible = this.completedConsultas.slice(start, start + this.completedPageSize);

    cards.innerHTML = visible.map((item) => this.card(item)).join("")
      || '<div class="empty">No hay consultas finalizadas con estos filtros.</div>';

    if (total <= this.completedPageSize) {
      pagination.replaceChildren();
      return;
    }

    pagination.innerHTML = `
      <span class="pagination-info">Mostrando ${start + 1}–${Math.min(start + this.completedPageSize, total)} de ${total}</span>
      <div class="pagination-actions">
        <button class="button secondary" type="button" data-page="previous" ${this.completedPage === 0 ? "disabled" : ""}>Anterior</button>
        <span class="pagination-current">Página ${this.completedPage + 1} de ${pageCount}</span>
        <button class="button secondary" type="button" data-page="next" ${this.completedPage >= pageCount - 1 ? "disabled" : ""}>Siguiente</button>
      </div>`;
  }

  card({ consulta, originalIndex }) {
    const finished = Boolean(consulta.fechaFin);
    const reference = consulta.referenciaExterna || consulta.idConsulta?.slice?.(0, 8) || "Sin referencia";
    const procedures = Array.isArray(consulta.procedimientos) ? consulta.procedimientos.length : 0;
    return `<article class="consultation-card">
      <div class="card-top"><h3 class="card-reference">Consulta ${esc(reference)}</h3>
      <span class="state ${finished ? "done" : ""}">${finished ? "Finalizada" : "Pendiente"}</span></div>
      <div class="card-meta">
        <div><strong>Paciente:</strong> ${esc(getPatientName(consulta))}</div>
        <div><strong>Inicio:</strong> ${esc(formatDate(consulta.fechaInicio))}</div>
        ${finished ? `<div><strong>Finalización:</strong> ${esc(formatDate(consulta.fechaFin))}</div>` : ""}
        <div><strong>Procedimientos:</strong> ${procedures}</div>
      </div>
      <div class="card-actions">
        <button class="button secondary" type="button" data-summary="${originalIndex}">Ver resumen</button>
        ${finished ? "" : `<button class="button" type="button" data-attend="${originalIndex}">Atender consulta</button>`}
      </div>
    </article>`;
  }

  onCardAction(event) {

    const pendingPageButton = event.target.closest("[data-pending-page]");

    if (pendingPageButton && !pendingPageButton.disabled) {
      this.pendingPage +=
        pendingPageButton.dataset.pendingPage === "next" ? 1 : -1;

      this.renderPendingPage();
      return;
    }

    const pageButton = event.target.closest("[data-page]");
    if (pageButton && !pageButton.disabled) {
      this.completedPage += pageButton.dataset.page === "next" ? 1 : -1;
      this.renderCompletedPage();
      return;
    }
    const summaryButton = event.target.closest("[data-summary]");
    const attendButton = event.target.closest("[data-attend]");
    if (summaryButton) this.mostrarResumen(Number(summaryButton.dataset.summary));
    if (attendButton) {
      const consulta = this.consultas[Number(attendButton.dataset.attend)];
      if (!consulta) return;
      this.dispatchEvent(new CustomEvent("consulta-selected", {
        detail: { consulta, asignacion: this.seleccion }, bubbles: true, composed: true
      }));
    }
  }

  mostrarResumen(index) {
    const consulta = this.consultas[index];
    if (!consulta) return;
    const root = this.shadowRoot.querySelector("#dialog-root");
    const procedures = (consulta.procedimientos ?? []).map((procedure) => {
      const steps = (procedure.pasos ?? []).map((step) => {
        const employee = step.idPersonaRol?.nombreCompleto
          ?? [step.idPersonaRol?.idPersona?.nombres, step.idPersonaRol?.idPersona?.apellidos].filter(Boolean).join(" ")
          ?? "";
        return `<div class="step">
          <strong>${esc(relationName(step.idProcedimientoPaso, "Paso"))}</strong>
          <p>Estado: ${esc(step.estado ?? "No especificado")}</p>
          <p>Inicio: ${esc(formatDate(step.fechaInicio))}${step.fechaFin ? ` · Fin: ${esc(formatDate(step.fechaFin))}` : ""}</p>
          <p>Realizado por: ${esc(employee || "No especificado")}</p>
          <button class="button secondary" type="button" data-step="${esc(procedure.idConsultaProcedimiento)}|${esc(step.idConsultaProcedimientoPaso)}">Ver registro del paso</button>
          <div class="record" data-record></div>
        </div>`;
      }).join("") || '<p class="muted">Sin pasos registrados.</p>';
      return `<section class="detail-section"><h3>${esc(relationName(procedure.idProcedimiento, "Procedimiento"))}</h3>${steps}</section>`;
    }).join("") || '<div class="empty">Esta consulta no tiene procedimientos asociados.</div>';

    root.innerHTML = `<div class="dialog-backdrop" data-close-backdrop>
      <section class="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
        <header class="dialog-head"><div><p class="eyebrow">Resumen de consulta</p><h2 id="dialog-title">${esc(consulta.referenciaExterna || consulta.idConsulta || "Consulta")}</h2></div>
        <button class="dialog-close" type="button" aria-label="Cerrar resumen" data-close>×</button></header>
        <div class="dialog-body">
          <section class="detail-section"><h3>Información general</h3>
            <p><strong>Paciente:</strong> ${esc(getPatientName(consulta))}</p>
            <p><strong>Inicio:</strong> ${esc(formatDate(consulta.fechaInicio))}</p>
            <p><strong>Fin:</strong> ${esc(formatDate(consulta.fechaFin))}</p>
            <p><strong>Estado:</strong> ${consulta.fechaFin ? "Finalizada" : "Pendiente"}</p>
            <p><strong>Observaciones:</strong> ${esc(consulta.observaciones || "Sin observaciones")}</p>
          </section>${procedures}
        </div>
      </section>
    </div>`;

    root.querySelector("[data-close]").addEventListener("click", () => root.replaceChildren());
    root.querySelector("[data-close-backdrop]").addEventListener("click", (event) => {
      if (event.target.hasAttribute("data-close-backdrop")) root.replaceChildren();
    });
    root.querySelectorAll("[data-step]").forEach((button) => {
      button.addEventListener("click", () => this.verRegistro(button));
    });
    root.querySelector("[data-close]").focus();
  }

  async verRegistro(button) {
    const [procedureId, stepId] = button.dataset.step.split("|");
    const output = button.nextElementSibling;
    button.disabled = true;
    output.textContent = "Consultando registro…";
    try {
      const record = await this.service.obtenerDetallePaso(procedureId, stepId);
      const orders = record?.ordenExamenList ?? [];
      output.textContent = record?.observaciones || record?.resultado || (orders.length
        ? JSON.stringify(orders, null, 2)
        : "No hay observaciones ni resultados registrados.");
    } catch (error) {
      output.textContent = `No se pudo consultar el registro: ${error.message}`;
    } finally {
      button.disabled = false;
    }
  }
}

defineOnce("ofiuco-dashboard", OfiucoDashboard);