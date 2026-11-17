/**
 * @fileoverview Web Component `<busqueda-citas>` correspondiente a la vista principal
 * de la Historia de Usuario 1 (HU1): Búsqueda de Citas Médicas.
 * Permite filtrar y consultar citas médicas mediante tipo y número de documento,
 * clínica y rango de fechas, así como descargar el ticket PDF de cada consulta.
 */

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

/** @type {number} Cantidad de registros solicitados por página en las consultas paginadas. */
const TAMANO_PAGINA = 50;

/** @type {number} Límite máximo de páginas a iterar para evitar ciclos infinitos. */
const MAX_PAGINAS = 20;

/** @type {string} Texto placeholder del input de documento cuando no hay tipo seleccionado. */
const PLACEHOLDER_SIN_TIPO = "Seleccione tipo doc";

/** @type {string} Texto placeholder por defecto del input de documento al seleccionar un tipo. */
const PLACEHOLDER_CON_TIPO = "Ingrese número...";

/**
 * Evalúa si un registro de catálogo se encuentra activo.
 * Un registro sin la bandera `activo` explícita en `false` se considera activo.
 *
 * @param {Object|null|undefined} registro - Objeto de catálogo (ej. tipo_documento o clinica).
 * @returns {boolean} `true` si el registro está activo; `false` en caso contrario.
 */
const esActivo = (registro) => registro?.activo !== false;

/**
 * Determina si un valor corresponde a un objeto entidad anidado (no nulo).
 *
 * @param {*} valor - Valor a evaluar.
 * @returns {boolean} `true` si es un objeto no nulo.
 */
const esEntidad = (valor) => valor !== null && typeof valor === "object";

/**
 * Extrae el identificador de una llave foránea (FK), soportando tanto un ID primitivo
 * como un objeto entidad anidado.
 *
 * @param {string|number|Object|null|undefined} fk - Valor de la llave foránea.
 * @param {string} clave - Nombre de la propiedad identificadora dentro del objeto entidad.
 * @returns {string|number|null} El identificador extraído o `null` si no existe.
 */
const idDe = (fk, clave) =>
  esEntidad(fk) ? (fk[clave] ?? null) : (fk ?? null);

/**
 * Obtiene la fecha local actual formateada como `YYYY-MM-DD`, compatible con `<input type="date">`.
 *
 * @returns {string} Fecha actual en formato `YYYY-MM-DD`.
 */
function fechaHoyLocal() {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, "0");
  const dia = String(hoy.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

/**
 * Normaliza cadenas de fecha provenientes de Jakarta JSON-B (ej. `"2026-10-29T16:26:54Z[UTC]"`)
 * eliminando el sufijo `"[UTC]"` para que el constructor `Date()` de JavaScript las parsee correctamente.
 *
 * @param {string|Date|null|undefined} valor - Fecha en formato string o instancia de `Date`.
 * @returns {Date|null} Instancia válida de `Date` o `null` si el valor es vacío o inválido.
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
 * Valida un número de documento contra una expresión regular exigiendo coincidencia completa
 * (envuelve el patrón con `^(?:...)$` por si viene con o sin anclas).
 * Si el patrón no existe o es una expresión regular inválida en BD, permite continuar sin bloquear.
 *
 * @param {string|null|undefined} patron - Expresión regular definida en `tipo_documento`.
 * @param {string} valor - Número de documento ingresado por el usuario.
 * @returns {boolean} `true` si cumple el formato o si no hay patrón válido; `false` si no coincide.
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
 * Componente web `<busqueda-citas>`.
 * Vista principal de la HU1: Búsqueda de Citas Médicas.
 * Gestiona el formulario de filtros, la carga de catálogos, la consulta encadenada
 * de documento -> persona -> rol -> consultas y el renderizado de resultados.
 *
 * @extends BaseComponent
 */
export class BusquedaCitas extends BaseComponent {
  /**
   * Hojas de estilo asociadas al Shadow DOM del componente.
   * @type {string[]}
   */
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

  /**
   * Crea una instancia de `BusquedaCitas` permitiendo inyección de dependencias para servicios y fábricas.
   *
   * @param {Object} [dependencias={}] - Servicios inyectados (por defecto instancia los servicios estándar).
   * @param {TipoDocumentoService} [dependencias.tipoDocumentoService]
   * @param {ClinicaService} [dependencias.clinicaService]
   * @param {ConsultaService} [dependencias.consultaService]
   * @param {PersonaService} [dependencias.personaService]
   * @param {function(string): PersonaRolService} [dependencias.personaRolFactory]
   * @param {function(string): DocumentoService} [dependencias.documentoFactory]
   */
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

  get catalogosListos() {
    return this.#catalogos ?? Promise.resolve();
  }

  /**
   * Construye la estructura DOM del componente dentro del Shadow DOM y registra
   * todos los listeners de interacción de filtros, envío de formulario y descarga de tickets.
   */
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

    // Habilita y configura el campo de número de documento al elegir un tipo de documento
    this.#acTipoDoc.addEventListener("option-selected", (event) => {
      this.#tipoDocSeleccionado = event.detail.option;
      const indicaciones = this.#tipoDocSeleccionado?.indicaciones;
      this.#inputNumDoc.disabled = false;
      this.#inputNumDoc.placeholder = indicaciones || PLACEHOLDER_CON_TIPO;
      this.#inputNumDoc.title = indicaciones || "";
      this.#inputNumDoc.focus();
      this.#ocultarEstado();
    });

    // Reinicia y deshabilita el campo de número de documento si se limpia la selección
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

    // Sincroniza límites mínimos y máximos entre selectores de fecha
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

    // Escucha el evento personalizado emitido por <tarjeta-cita> para descargar el PDF
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

  /**
   * Ciclo de vida ejecutado cuando el componente se conecta al DOM.
   * Inicia la carga de catálogos si aún no se ha ejecutado.
   */
  onConnect() {
    if (!this.#catalogos) this.#catalogos = this.#cargarCatalogos();
  }

  /**
   * Lee todas las páginas disponibles de un servicio de catálogo mediante `findRange`.
   * Soporta respuestas estructuradas como `{ registros: Array }` o un `Array` directo.
   *
   * @param {Object} servicio - Instancia del servicio que implementa `findRange(first, max)`.
   * @returns {Promise<Array<Object>>} Lista completa de registros acumulados.
   */
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

  /**
   * Consulta de forma paginada una ruta relativa a la URL base del backend
   * (ej. `"persona/{id}/persona-rol"`, `"persona-rol/{id}/consulta"`).
   *
   * @param {string} recurso - Ruta relativa y parámetros query del recurso REST.
   * @returns {Promise<Array<Object>>} Lista completa de registros obtenidos.
   * @throws {Error} Si la respuesta HTTP no es exitosa (`!resp.ok`).
   */
  async #obtenerColeccionRaiz(recurso) {
    const base = (this.#personaService.URL ?? "").replace(/\/persona\/?$/, "/");
    const sep = recurso.includes("?") ? "&" : "?";
    const registros = [];
    for (let pagina = 0; pagina < MAX_PAGINAS; pagina += 1) {
      const first = pagina * TAMANO_PAGINA;
      const resp = await fetch(
        `${base}${recurso}${sep}first=${first}&max=${TAMANO_PAGINA}`,
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

  /**
   * Carga en paralelo los catálogos de tipos de documento y clínicas activas,
   * poblando los componentes de autocompletado y el mapa caché de clínicas.
   * Muestra un mensaje de error si ambos catálogos fallan.
   *
   * @returns {Promise<void>}
   */
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

  /**
   * Valida los filtros seleccionados en el formulario y ejecuta el flujo de búsqueda:
   * 1. Busca el documento del paciente para obtener su `idPersona`.
   * 2. Obtiene los registros `persona-rol` asociados a la persona y filtrados por la clínica seleccionada.
   * 3. Consulta las citas médicas (`consulta`) de cada rol válido y aplica el filtro por rango de fechas.
   * 4. Renderiza las tarjetas resultantes en pantalla.
   *
   * @returns {Promise<void>}
   */
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
   * Renderiza las tarjetas de consulta (`<tarjeta-cita>`) en el grid de resultados.
   * Si la lista está vacía, limpia el grid y muestra un mensaje informativo.
   *
   * @param {Array<Consulta>} [consultas=[]] - Lista de entidades `Consulta` a mostrar.
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
   * Resuelve el nombre legible de la clínica asociada a una consulta, buscando
   * en las entidades anidadas, en el mapa en caché o en la clínica seleccionada en el filtro.
   *
   * @param {Consulta|Object} consulta - Objeto o entidad de consulta médica.
   * @returns {string} Nombre de la clínica o cadena vacía si no se encuentra.
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

  /**
   * Muestra un mensaje informativo o de error en la barra de estado del componente.
   *
   * @param {string} mensaje - Texto a mostrar al usuario.
   * @param {boolean} [esError=false] - Indica si el mensaje debe estilizarse como error.
   */
  #mostrarEstado(mensaje, esError = false) {
    this.#estadoEl.textContent = mensaje;
    this.#estadoEl.classList.toggle("error", esError);
    this.#estadoEl.hidden = false;
  }

  /**
   * Oculta y limpia el mensaje de la barra de estado del componente.
   */
  #ocultarEstado() {
    this.#estadoEl.textContent = "";
    this.#estadoEl.classList.remove("error");
    this.#estadoEl.hidden = true;
  }
}

defineOnce("busqueda-citas", BusquedaCitas);

export default BusquedaCitas;