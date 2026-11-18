/**
 * @fileoverview Web Component `<ofiuco-login>` que implementa la vista de inicio de sesión
 * del portal del personal (`GalenoSV · Portal del personal`). Permite seleccionar el tipo
 * de documento mediante `<ofiuco-auto-complete>`, ingresar el número de documento y
 * autenticar al empleado contra `LoginService`, emitiendo `login-success` tras validar
 * sus credenciales y asignaciones.
 */

import { BaseComponent } from "../core/base-component.js";
import { defineOnce } from "../core/define-once.js";
import { h } from "../core/dom.js";
import "./primitives/ofiuco-auto-complete.js";
import LoginService from "../../control/login_service.js";

/**
 * Componente web `<ofiuco-login>`.
 *
 * Formulario de acceso institucional basado en tipo y número de documento registrado.
 * Carga de forma asíncrona el catálogo de tipos de documento al conectarse al DOM,
 * valida los campos requeridos antes de enviar la solicitud de autenticación y despacha
 * el evento personalizado `login-success` (`bubbles: true`, `composed: true`) con el
 * resultado de la sesión.
 *
 * @extends BaseComponent
 * @fires CustomEvent#login-success
 */
export class OfiucoLogin extends BaseComponent {
  /**
   * Hojas de estilo cargadas en el Shadow DOM del componente.
   * @type {string[]}
   */
  static styleUrls = [
    new URL("../../../resources/styles/components/login.css", import.meta.url)
      .href,
  ];

  /**
   * Inicializa el servicio de autenticación `LoginService`, el catálogo local de
   * tipos de documento, la selección actual y la bandera de carga.
   */
  constructor() {
    super();
    this.service = new LoginService();
    this.tiposDocumento = [];
    this.tipoDocumentoSeleccionado = null;
    this.cargandoTipos = false;
  }

  /**
   * Construye la estructura DOM de la pantalla de acceso dentro del Shadow DOM
   * (encabezados institucionales, selector `<ofiuco-auto-complete>` de tipo de documento,
   * campo de número de documento, botón de envío y región de estado accesible) y enlaza
   * los eventos de selección, edición y envío del formulario.
   */
  render() {
    const tipoDocumento = h("ofiuco-auto-complete", {
      id: "tipoDocumento",
      label: "Tipo de documento",
      placeholder: "Seleccione un tipo de documento",
      required: true,
      "min-chars": "0",
    });

    const numeroDocumento = h("input", {
      id: "numero",
      name: "numeroDocumento",
      type: "text",
      autocomplete: "off",
      required: true,
      maxlength: "255",
      placeholder: "Ingrese su número de documento",
      "aria-describedby": "status",
    });

    const status = h("p", {
      id: "status",
      class: "status",
      role: "alert",
      "aria-live": "polite",
    });

    const button = h(
      "button",
      {
        class: "submit",
        type: "submit",
      },
      "Acceder",
    );

    const form = h(
      "form",
      {},
      h("div", { class: "field" }, tipoDocumento),
      h(
        "div",
        { class: "field" },
        h("label", { for: "numero" }, "Número de documento"),
        numeroDocumento,
      ),
      button,
      status,
    );

    this.shadowRoot.append(
      h(
        "section",
        { class: "login-shell", "aria-labelledby": "login-title" },
        h("p", { class: "eyebrow" }, "GalenoSV · Portal del personal"),
        h("h1", { id: "login-title" }, "Bienvenido"),
        h(
          "p",
          { class: "subtitle" },
          "Accede con el documento registrado en el sistema.",
        ),
        form,
      ),
    );

    tipoDocumento.addEventListener("option-selected", (event) => {
      this.tipoDocumentoSeleccionado = event.detail.option;
      status.textContent = "";
    });

    tipoDocumento.addEventListener("value-changed", () => {
      this.tipoDocumentoSeleccionado = null;
    });

    form.addEventListener("submit", (event) => this.login(event));
  }

  /**
   * Ciclo de vida ejecutado al conectar el componente al DOM.
   * Obtiene de forma asíncrona los tipos de documento activos a través de `this.service`
   * si aún no han sido cargados y los asigna al componente `<ofiuco-auto-complete>`.
   *
   * @returns {Promise<void>}
   */
  async onConnect() {
    if (this.cargandoTipos || this.tiposDocumento.length) return;
    this.cargandoTipos = true;
    const autocomplete = this.shadowRoot.querySelector("#tipoDocumento");
    const status = this.shadowRoot.querySelector("#status");

    try {
      this.tiposDocumento = await this.service.obtenerTiposDocumento();
      autocomplete.options = this.tiposDocumento;
      if (!this.tiposDocumento.length) {
        status.textContent = "No hay tipos de documento activos disponibles.";
      }
    } catch (error) {
      status.textContent = `No se pudieron cargar los tipos de documento, verifique su conexion`;
    } finally {
      this.cargandoTipos = false;
    }
  }

  /**
   * Maneja el envío del formulario de inicio de sesión: valida que exista un tipo
   * de documento seleccionado y un número de documento no vacío, deshabilita el botón
   * durante la consulta a `this.service.autenticar()` y emite `login-success` si la
   * autenticación es exitosa, o muestra el mensaje de error en `#status`.
   *
   * @param {SubmitEvent} event - Evento nativo `submit` del formulario.
   * @returns {Promise<void>}
   */
  async login(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector("button[type='submit']");
    const status = this.shadowRoot.querySelector("#status");
    const numeroDocumento = this.shadowRoot.querySelector("#numero");

    if (!this.tipoDocumentoSeleccionado?.idTipoDocumento) {
      status.textContent = "Seleccione un tipo de documento de la lista.";
      return;
    }
    if (!numeroDocumento.value.trim()) {
      status.textContent = "Ingrese su número de documento.";
      numeroDocumento.focus();
      return;
    }

    button.disabled = true;
    button.textContent = "Verificando…";
    status.textContent = "";

    try {
      const resultado = await this.service.autenticar({
        idTipoDocumento: this.tipoDocumentoSeleccionado.idTipoDocumento,
        numeroDocumento: numeroDocumento.value.trim(),
      });
      this.dispatchEvent(
        new CustomEvent("login-success", {
          detail: resultado,
          bubbles: true,
          composed: true,
        }),
      );
    } catch (error) {
      status.textContent = error.message || "No fue posible iniciar sesión.";
    } finally {
      button.disabled = false;
      button.textContent = "Acceder";
    }
  }
}

defineOnce("ofiuco-login", OfiucoLogin);
