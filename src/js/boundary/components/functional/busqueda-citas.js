import { BaseComponent } from "../../core/base-component.js";
import { defineOnce } from "../../core/define-once.js";
import { h } from "../../core/dom.js";
import "../primitives/ofiuco-auto-complete.js";
import "./ofiuco-date-picker.js";
import "./tarjeta-cita.js";
import TipoDocumentoService from "../../../control/tipoDocumento_service.js";
import ClinicaService from "../../../control/clinica_service.js";
import ConsultaService from "../../../control/consulta_service.js";

/**
 * <busqueda-citas>
 * Vista principal de la HU1: Búsqueda de Citas Médicas.
 * Permite seleccionar Tipo de Documento, ingresar N° de Documento,
 * seleccionar Clínica, filtrar por rango de fechas (Desde / Hasta)
 * y visualizar las citas encontradas en tarjetas (<tarjeta-cita>).
 */
export class BusquedaCitas extends BaseComponent {
  static styleUrls = [
    new URL(
      "../../../../resources/styles/components/busqueda_citas.css",
      import.meta.url,
    ).href,
  ];

  #tipoDocumentoService;
  #clinicaService;
  #consultaService;

  #acTipoDoc;
  #inputNumDoc;
  #acClinica;
  #dpDesde;
  #dpHasta;
  #estadoEl;
  #gridResultados;

  #tipoDocSeleccionado = null;
  #clinicaSeleccionada = null;
  #clinicasMapa = new Map();

  constructor({
    tipoDocumentoService = new TipoDocumentoService(),
    clinicaService = new ClinicaService(),
    consultaService = new ConsultaService(),
  } = {}) {
    super();
    this.#tipoDocumentoService = tipoDocumentoService;
    this.#clinicaService = clinicaService;
    this.#consultaService = consultaService;
  }

  render() {
    this.#acTipoDoc = h("ofiuco-auto-complete", {
      label: "Tipo Doc",
      placeholder: "Seleccione...",
      "min-chars": "0",
    });

    const numDocId = `num-doc-${Math.random().toString(36).slice(2, 8)}`;
    this.#inputNumDoc = h("input", {
      id: numDocId,
      type: "text",
      class: "campo-input",
      placeholder: "Seleccione tipo doc",
      disabled: true,
      autocomplete: "off",
    });

    this.#acClinica = h("ofiuco-auto-complete", {
      label: "Clínica",
      placeholder: "Seleccione clínica...",
      "min-chars": "0",
    });

    this.#dpDesde = h("ofiuco-date-picker", {
      label: "Desde",
    });

    this.#dpHasta = h("ofiuco-date-picker", {
      label: "Hasta",
    });

    const btnBuscar = h(
      "button",
      { type: "submit", class: "btn-buscar" },
      "Buscar",
    );

    const form = h(
      "form",
      { class: "barra-filtros", novalidate: true },
      this.#acTipoDoc,
      h(
        "div",
        { class: "campo-grupo" },
        h("label", { for: numDocId, class: "campo-label" }, "N° Doc"),
        this.#inputNumDoc,
      ),
      this.#acClinica,
      this.#dpDesde,
      this.#dpHasta,
      btnBuscar,
    );

    this.#estadoEl = h("p", {
      class: "mensaje-estado",
      role: "status",
      hidden: true,
    });

    this.#gridResultados = h("section", {
      class: "grid-resultados",
      "aria-label": "Resultados de citas médicas",
    });

    this.#acTipoDoc.addEventListener("option-selected", (event) => {
      this.#tipoDocSeleccionado = event.detail.option;
      this.#inputNumDoc.disabled = false;
      this.#inputNumDoc.placeholder = "Ingrese número...";
      this.#inputNumDoc.focus();
      this.#ocultarEstado();
    });

    this.#acTipoDoc.addEventListener("value-changed", () => {
      this.#tipoDocSeleccionado = null;
      this.#inputNumDoc.value = "";
      this.#inputNumDoc.disabled = true;
      this.#inputNumDoc.placeholder = "Seleccione tipo doc";
    });

    this.#acClinica.addEventListener("option-selected", (event) => {
      this.#clinicaSeleccionada = event.detail.option;
      this.#ocultarEstado();
    });

    this.#acClinica.addEventListener("value-changed", () => {
      this.#clinicaSeleccionada = null;
    });

    this.#dpDesde.addEventListener("change", () => {
      this.#dpHasta.minDate = this.#dpDesde.value || "";
    });

    this.#dpHasta.addEventListener("change", () => {
      this.#dpDesde.maxDate = this.#dpHasta.value || "";
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      this.buscar();
    });

    this.#gridResultados.addEventListener("descargar-ticket", async (event) => {
      const consulta = event.detail?.consulta;
      const idConsulta = consulta?.idConsulta;
      const idPersonaRol =
        consulta?.idPersonaRol?.idPersonaRol ?? consulta?.idPersonaRol;

      if (!idConsulta || !idPersonaRol) {
        this.#mostrarEstado(
          "No se encontraron los datos necesarios para descargar el ticket.",
          true,
        );
        return;
      }

      try {
        this.#mostrarEstado("Generando ticket PDF...", false);
        await this.#consultaService.descargarTicketPdf(
          idPersonaRol,
          idConsulta,
        );
        this.#ocultarEstado();
      } catch (error) {
        this.#mostrarEstado(
          error?.mensaje || "No se pudo descargar el ticket PDF de la cita.",
          true,
        );
      }
    });

    this.shadowRoot.append(
      h(
        "main",
        { class: "contenedor-hu1" },
        form,
        this.#estadoEl,
        this.#gridResultados,
      ),
    );
  }

  onConnect() {
    this.#cargarCatalogos();
  }

  async #cargarCatalogos() {
    try {
      const [respTipos, respClinicas] = await Promise.all([
        this.#tipoDocumentoService.findRange(0, 50),
        this.#clinicaService.findRange(0, 50),
      ]);

      const tipos = Array.isArray(respTipos?.registros)
        ? respTipos.registros
        : [];
      this.#acTipoDoc.options = tipos.map((t) => ({
        value: t.idTipoDocumento,
        label: t.nombre ?? t.descripcion ?? "",
        ...t,
      }));

      const clinicas = Array.isArray(respClinicas?.registros)
        ? respClinicas.registros
        : [];
      this.#clinicasMapa.clear();
      this.#acClinica.options = clinicas.map((c) => {
        const id = c.idClinica ?? c.id;
        const label = c.nombreClinica ?? c.nombre ?? "";
        if (id) this.#clinicasMapa.set(String(id), label);
        return { value: id, label, ...c };
      });
    } catch {
      this.#mostrarEstado(
        "No se pudieron cargar los catálogos de búsqueda desde el servidor.",
        true,
      );
    }
  }

  async buscar() {
    const numeroDocumento = this.#inputNumDoc.value.trim();

    if (!this.#tipoDocSeleccionado) {
      this.#mostrarEstado("Seleccione un tipo de documento.", true);
      return;
    }

    if (!numeroDocumento) {
      this.#mostrarEstado("Ingrese el número de documento del paciente.", true);
      return;
    }

    const patron = this.#tipoDocSeleccionado.expresionRegular;
    if (patron) {
      try {
        const regex = new RegExp(patron);
        if (!regex.test(numeroDocumento)) {
          this.#mostrarEstado(
            `El número de documento no cumple el formato esperado para ${this.#tipoDocSeleccionado.nombre ?? "el documento"}.`,
            true,
          );
          return;
        }
      } catch {
        // Si la expresión regular del servidor no es válida, no bloqueamos.
      }
    }

    if (!this.#clinicaSeleccionada) {
      this.#mostrarEstado("Seleccione una clínica de la lista.", true);
      return;
    }

    const desde = this.#dpDesde.value || null;
    const hasta = this.#dpHasta.value || null;

    if (desde && hasta && desde > hasta) {
      this.#mostrarEstado(
        "La fecha 'Desde' no puede ser posterior a la fecha 'Hasta'.",
        true,
      );
      return;
    }

    this.#mostrarEstado("Buscando citas médicas...", false);

    try {
      const consultas = await this.#consultaService.buscarConsultas({
        idTipoDocumento: this.#tipoDocSeleccionado.idTipoDocumento,
        numeroDocumento,
        idClinica:
          this.#clinicaSeleccionada.idClinica ??
          this.#clinicaSeleccionada.value,
        desde,
        hasta,
      });

      this.mostrarResultados(consultas);
    } catch {
      this.#gridResultados.replaceChildren();
      this.#mostrarEstado(
        "Ocurrió un error al consultar las citas médicas.",
        true,
      );
    }
  }

  /**
   * Renderiza las tarjetas de consulta en el grid de resultados.
   * @param {Array} consultas
   */
  mostrarResultados(consultas = []) {
    if (!Array.isArray(consultas) || consultas.length === 0) {
      this.#gridResultados.replaceChildren();
      this.#mostrarEstado(
        "No se encontraron citas médicas con los filtros seleccionados.",
        false,
      );
      return;
    }

    this.#ocultarEstado();

    const nombreClinicaSeleccionada =
      this.#clinicaSeleccionada?.nombreClinica ??
      this.#clinicaSeleccionada?.label ??
      "";

    const tarjetas = consultas.map((consulta) => {
      const card = h("tarjeta-cita");
      const idClinicaConsulta =
        consulta.clinica?.idClinica ?? consulta.clinica ?? null;
      card.clinicaNombre =
        consulta.clinica?.nombreClinica ??
        consulta.clinica?.nombre ??
        (idClinicaConsulta
          ? this.#clinicasMapa.get(String(idClinicaConsulta))
          : "") ??
        nombreClinicaSeleccionada;
      card.consulta = consulta;
      return card;
    });

    this.#gridResultados.replaceChildren(...tarjetas);
  }

  #mostrarEstado(mensaje, esError = false) {
    this.#estadoEl.textContent = mensaje;
    this.#estadoEl.classList.toggle("error", esError);
    this.#estadoEl.hidden = false;
  }

  #ocultarEstado() {
    this.#estadoEl.textContent = "";
    this.#estadoEl.classList.remove("error");
    this.#estadoEl.hidden = true;
  }
}

defineOnce("busqueda-citas", BusquedaCitas);

export default BusquedaCitas;