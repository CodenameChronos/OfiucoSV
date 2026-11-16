import { BaseComponent } from "../core/base-component.js";
import { defineOnce } from "../core/define-once.js";
import { h } from "../core/dom.js";
import "./primitives/ofiuco-auto-complete.js";
import LoginService from "../../control/login_service.js";

export class OfiucoLogin extends BaseComponent {
  static styleUrls = [
    new URL("../../../resources/styles/components/login.css", import.meta.url).href
  ];

  constructor() {
    super();
    this.service = new LoginService();
    this.tiposDocumento = [];
    this.tipoDocumentoSeleccionado = null;
    this.cargandoTipos = false;
  }

  render() {
    const tipoDocumento = h("ofiuco-auto-complete", {
      id: "tipoDocumento",
      label: "Tipo de documento",
      placeholder: "Seleccione un tipo de documento",
      required: true,
      "min-chars": "0"
    });

    const numeroDocumento = h("input", {
      id: "numero",
      name: "numeroDocumento",
      type: "text",
      autocomplete: "off",
      required: true,
      maxlength: "255",
      placeholder: "Ingrese su número de documento",
      "aria-describedby": "status"
    });

    const status = h("p", {
      id: "status",
      class: "status",
      role: "alert",
      "aria-live": "polite"
    });

    const button = h("button", {
      class: "submit",
      type: "submit"
    }, "Acceder");

    const form = h("form", {},
      h("div", { class: "field" }, tipoDocumento),
      h("div", { class: "field" },
        h("label", { for: "numero" }, "Número de documento"),
        numeroDocumento
      ),
      button,
      status
    );

    this.shadowRoot.append(
      h("section", { class: "login-shell", "aria-labelledby": "login-title" },
        h("p", { class: "eyebrow" }, "GalenoSV · Portal del personal"),
        h("h1", { id: "login-title" }, "Bienvenido"),
        h("p", { class: "subtitle" }, "Accede con el documento registrado en el sistema."),
        form,
        h("p", { class: "hint" }, "El acceso comprueba el documento y las asignaciones de empleado registradas.")
      )
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
      status.textContent = `No se pudieron cargar los tipos de documento: ${error.message}`;
    } finally {
      this.cargandoTipos = false;
    }
  }

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
        numeroDocumento: numeroDocumento.value.trim()
      });
      this.dispatchEvent(new CustomEvent("login-success", {
        detail: resultado,
        bubbles: true,
        composed: true
      }));
    } catch (error) {
      status.textContent = error.message || "No fue posible iniciar sesión.";
    } finally {
      button.disabled = false;
      button.textContent = "Acceder";
    }
  }
}

defineOnce("ofiuco-login", OfiucoLogin);
