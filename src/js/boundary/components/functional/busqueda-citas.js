import { BaseComponent } from "../../core/base-component.js";
import { defineOnce } from "../../core/define-once.js";
import { h } from "../../core/dom.js";
import "../primitives/ofiuco-auto-complete.js";
import "./ofiuco-date-picker.js";
import "./tarjeta-cita.js";
import TipoDocumentoService from "../../../control/tipoDocumento_service.js";
import ClinicaService from "../../../control/clinica_service.js";
import ConsultaService from "../../../control/consulta_service.js";
import Consulta from "../../../entity/consulta.js";
import PersonaService from "../../../control/persona_service.js";
import PersonaRolService from "../../../control/personaRol_service.js";
import DocumentoService from "../../../control/documento_service.js";

const TAMANO_PAGINA = 50;
const MAX_PAGINAS = 20;
const PLACEHOLDER_SIN_TIPO = "Seleccione tipo doc";
const PLACEHOLDER_CON_TIPO = "Ingrese número...";

/** tipo_documento.activo y clinica.activo: un registro sin la bandera se trata como activo. */
const esActivo = (registro) => registro?.activo !== false;

/** Una FK puede llegar como id (string) o como la entidad anidada. */
const esEntidad = (valor) => valor !== null && typeof valor === "object";
const idDe = (fk, clave) =>
  esEntidad(fk) ? (fk[clave] ?? null) : (fk ?? null);

/** Devuelve la fecha local actual en formato YYYY-MM-DD para <input type="date">. */
function fechaHoyLocal() {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, "0");
  const dia = String(hoy.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}
/**
 * Normaliza fechas provenientes de Jakarta JSON-B (ej. "2026-10-29T16:26:54Z[UTC]")
 * eliminando el sufijo "[UTC]" para que Date() de JavaScript las parsee correctamente.
 */
function parsearFechaUtc(valor) {
  if (!valor) return null;
  if (valor instanceof Date) return valor;
  const limpia = String(valor)
    .trim()
    .replace(/\[UTC\]$/, "");
  const fecha = new Date(limpia);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

/**
 * Valida el número contra tipo_documento.expresion_regular exigiendo que
 * coincida COMPLETO (la expresión puede venir con o sin anclas ^ $).
 * Una expresión inválida en la base de datos no bloquea al usuario.
 */
function cumpleFormato(patron, valor) {
  if (!patron) return true;
  try {
    return new RegExp(`^(?:${patron})$`).test(valor);
  } catch {
    return true;
  }
}

/**
 * <busqueda-citas>
 * Vista principal de la HU1: Búsqueda de Citas Médicas.
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
  #personaService;
  #personaRolFactory;
  #documentoFactory;

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
  #catalogos = null;

  constructor({
    tipoDocumentoService = new TipoDocumentoService(),
    clinicaService = new ClinicaService(),
    consultaService = new ConsultaService(),
    personaService = new PersonaService(),
    personaRolFactory = (idPersona) => new PersonaRolService(idPersona),
    documentoFactory = (idPersona) => new DocumentoService(idPersona),
  } = {}) {
    super();
    this.#tipoDocumentoService = tipoDocumentoService;
    this.#clinicaService = clinicaService;
    this.#consultaService = consultaService;
    this.#personaService = personaService;
    this.#personaRolFactory = personaRolFactory;
    this.#documentoFactory = documentoFactory;
  }

  /** Promesa de la carga de catálogos (útil en pruebas y para reintentar). */
  get catalogosListos() {
    return this.#catalogos ?? Promise.resolve();
  }

  render() {
    this.#acTipoDoc = h("ofiuco-auto-complete", {
      label: "Tipo Doc",
      placeholder: "Seleccione...",
      "min-chars": "0",
    });

    const hoy = fechaHoyLocal();

    this.#dpDesde = h("ofiuco-date-picker", {
      label: "Desde",
      value: hoy,
      "max-date": hoy,
    });

    this.#dpHasta = h("ofiuco-date-picker", {
      label: "Hasta",
      value: hoy,
      "min-date": hoy,
    });

    const numDocId = `num-doc-${Math.random().toString(36).slice(2, 8)}`;
    this.#inputNumDoc = h("input", {
      id: numDocId,
      type: "text",
      class: "campo-input",
      placeholder: PLACEHOLDER_SIN_TIPO,
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
      const indicaciones = this.#tipoDocSeleccionado?.indicaciones;
      this.#inputNumDoc.disabled = false;
      this.#inputNumDoc.placeholder = indicaciones || PLACEHOLDER_CON_TIPO;
      this.#inputNumDoc.title = indicaciones || "";
      this.#inputNumDoc.focus();
      this.#ocultarEstado();
    });

    this.#acTipoDoc.addEventListener("value-changed", () => {
      this.#tipoDocSeleccionado = null;
      this.#inputNumDoc.value = "";
      this.#inputNumDoc.disabled = true;
      this.#inputNumDoc.placeholder = PLACEHOLDER_SIN_TIPO;
      this.#inputNumDoc.title = "";
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
      const idPersonaRol = idDe(consulta?.idPersonaRol, "idPersonaRol");

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
    if (!this.#catalogos) this.#catalogos = this.#cargarCatalogos();
  }

  /** Lee todas las páginas de un catálogo (soporta { registros } o Array directo). */
  async #cargarTodos(servicio) {
    const registros = [];
    for (let pagina = 0; pagina < MAX_PAGINAS; pagina += 1) {
      const respuesta = await servicio.findRange(
        pagina * TAMANO_PAGINA,
        TAMANO_PAGINA,
      );
      const lote = Array.isArray(respuesta)
        ? respuesta
        : Array.isArray(respuesta?.registros)
          ? respuesta.registros
          : [];
      registros.push(...lote);
      if (lote.length < TAMANO_PAGINA) break;
    }
    return registros;
  }

  /** Consulta una colección raíz del backend (ej. "documento", "persona-rol", "consulta"). */
  async #obtenerColeccionRaiz(recurso) {
    const base = (this.#personaService.URL ?? "").replace(/\/persona\/?$/, "/");
    const registros = [];
    for (let pagina = 0; pagina < MAX_PAGINAS; pagina += 1) {
      const first = pagina * TAMANO_PAGINA;
      const resp = await fetch(
        `${base}${recurso}?first=${first}&max=${TAMANO_PAGINA}`,
      );
      if (!resp.ok) {
        throw new Error(`Error HTTP ${resp.status} al consultar ${recurso}`);
      }
      const data = await resp.json();
      const lote = Array.isArray(data)
        ? data
        : Array.isArray(data?.registros)
          ? data.registros
          : [];
      registros.push(...lote);
      if (lote.length < TAMANO_PAGINA) break;
    }
    return registros;
  }

  async #cargarCatalogos() {
    try {
      const [resTipos, resClinicas] = await Promise.allSettled([
        this.#cargarTodos(this.#tipoDocumentoService),
        this.#cargarTodos(this.#clinicaService),
      ]);

      if (resTipos.status === "fulfilled" && this.#acTipoDoc) {
        this.#acTipoDoc.options = resTipos.value.filter(esActivo).map((t) => ({
          ...t,
          value: t.idTipoDocumento,
          label: t.nombre ?? "",
        }));
      } else if (resTipos.status === "rejected") {
        console.error("Fallo al cargar tipos de documento:", resTipos.reason);
      }

      if (resClinicas.status === "fulfilled" && this.#acClinica) {
        this.#clinicasMapa.clear();
        this.#acClinica.options = resClinicas.value
          .filter(esActivo)
          .map((c) => {
            const id = c.idClinica ?? c.id;
            const label = c.nombreClinica ?? c.nombre ?? "";
            if (id) this.#clinicasMapa.set(String(id), label);
            return { ...c, value: id, label };
          });
      } else if (resClinicas.status === "rejected") {
        console.error("Fallo al cargar clínicas:", resClinicas.reason);
      }

      if (resTipos.status === "rejected" && resClinicas.status === "rejected") {
        this.#catalogos = null;
        this.#mostrarEstado(
          "No se pudieron cargar los catálogos de búsqueda desde el servidor.",
          true,
        );
      }
    } catch (err) {
      console.error("Error inesperado en #cargarCatalogos:", err);
      this.#catalogos = null;
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

    if (
      !cumpleFormato(
        this.#tipoDocSeleccionado.expresionRegular,
        numeroDocumento,
      )
    ) {
      const { nombre, indicaciones } = this.#tipoDocSeleccionado;
      this.#mostrarEstado(
        `El número de documento no cumple el formato esperado para ${nombre ?? "el documento"}.${indicaciones ? ` ${indicaciones}` : ""}`,
        true,
      );
      return;
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
      const idTipoDocumento = this.#tipoDocSeleccionado.idTipoDocumento;
      const idClinica =
        this.#clinicaSeleccionada.idClinica ?? this.#clinicaSeleccionada.value;

      // 1. Obtener documentos desde la ruta real de DocumentoResource: persona/{uuid}/documento
      const documentos = await this.#obtenerColeccionRaiz(
        `persona/00000000-0000-0000-0000-000000000000/documento?idTipoDocumento=${encodeURIComponent(idTipoDocumento)}&valor=${encodeURIComponent(numeroDocumento)}`,
      );

      const docCoincidente = documentos.find((d) => {
        const tipo = idDe(d.idTipoDocumento, "idTipoDocumento");
        const num = String(
          d.valor ?? d.numeroDocumento ?? d.numero ?? "",
        ).trim();
        return (
          String(tipo) === String(idTipoDocumento) && num === numeroDocumento
        );
      });

      const idPersona = idDe(docCoincidente?.idPersona, "idPersona");
      if (!idPersona) {
        this.mostrarResultados([]);
        return;
      }

      // 2. Obtener registros persona-rol usando la ruta anidada: persona/{idPersona}/persona-rol
      const roles = await this.#obtenerColeccionRaiz(
        `persona/${encodeURIComponent(idPersona)}/persona-rol`,
      );

      const rolesValidos = roles.filter((r) => {
        const personaRol = idDe(r.idPersona, "idPersona");
        const clinicaRol = idDe(r.idClinica, "idClinica");
        return (
          (!personaRol || String(personaRol) === String(idPersona)) &&
          String(clinicaRol) === String(idClinica)
        );
      });

      if (rolesValidos.length === 0) {
        this.mostrarResultados([]);
        return;
      }

      // 3. Obtener consultas usando la ruta anidada: persona-rol/{idPersonaRol}/consulta
      const listasConsultas = await Promise.all(
        rolesValidos.map((rol) =>
          this.#obtenerColeccionRaiz(
            `persona-rol/${encodeURIComponent(rol.idPersonaRol)}/consulta`,
          ),
        ),
      );

      const consultasRaw = listasConsultas.flat();
      const limiteDesde = desde
        ? new Date(`${desde}T00:00:00`).getTime()
        : null;
      const limiteHasta = hasta
        ? new Date(`${hasta}T23:59:59.999`).getTime()
        : null;

      const filtradas = consultasRaw
        .map((c) => Consulta.fromJSON(c))
        .filter((consulta) => {
          if (!consulta) return false;
          if (limiteDesde || limiteHasta) {
            if (!(consulta.fechaInicio instanceof Date)) return false;
            const tiempo = consulta.fechaInicio.getTime();
            if (limiteDesde && tiempo < limiteDesde) return false;
            if (limiteHasta && tiempo > limiteHasta) return false;
          }
          return true;
        });

      this.mostrarResultados(filtradas);
    } catch (error) {
      console.error("Error al consultar citas médicas:", error);
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

    const tarjetas = consultas.map((consulta) => {
      const card = h("tarjeta-cita");
      card.clinicaNombre = this.#nombreClinicaDe(consulta);
      card.consulta = consulta;
      return card;
    });

    this.#gridResultados.replaceChildren(...tarjetas);
  }

  /**
   * Nombre de la clínica de una consulta.
   */
  #nombreClinicaDe(consulta) {
    const rol = consulta?.idPersonaRol;
    const fk = esEntidad(rol) ? rol.idClinica : null;
    const idClinica =
      idDe(fk, "idClinica") ?? idDe(consulta?.clinica, "idClinica");

    return (
      (esEntidad(fk) ? (fk.nombreClinica ?? fk.nombre) : null) ||
      (esEntidad(consulta?.clinica)
        ? (consulta.clinica.nombreClinica ?? consulta.clinica.nombre)
        : null) ||
      (idClinica ? this.#clinicasMapa.get(String(idClinica)) : null) ||
      this.#clinicaSeleccionada?.nombreClinica ||
      this.#clinicaSeleccionada?.nombre ||
      ""
    );
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
