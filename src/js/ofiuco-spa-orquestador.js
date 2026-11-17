// Importaciones de componentes de layout y vistas (HU1, HU2, HU3 y HU4)
import "../js/boundary/components/layout/ofiuco-header.js";
import "../js/boundary/components/layout/ofiuco-footer.js";
import "../js/boundary/components/functional/busqueda-citas.js"; // HU1
import "../js/boundary/components/ofiuco-login.js"; // HU2
import "../js/boundary/components/ofiuco-dashboard.js"; // HU3
import "../js/boundary/ofiuco-page-consulta.js"; // HU4
import { ConsultaEventos } from "../js/boundary/core/eventos-consulta.js";

class SPAOrchestrator {
  #appContainer;
  #sesionActual = null;

  constructor() {
    this.init();
  }

  init() {
    this.#appContainer = document.querySelector("#OfiucoSV");

    if (!this.#appContainer) {
      console.error(
        "Error crítico: No se encontró el elemento #OfiucoSV en el DOM.",
      );
      return;
    }

    this.setupListeners();
    this.cargarBusquedaCitas(); // Vista por defecto (HU1)
  }

  setupListeners() {
    // Escuchar cuando el usuario hace clic en "Atender consulta" desde las tarjetas (HU1 o HU3)
    document.addEventListener("ofiuco:consulta-select", (evento) => {
      const consulta = evento.detail.consulta;
      this.cargarAtencionConsulta(consulta);
    });
  }

  #toggleLoginButtonVisibility(mostrar) {
    const headerEl = document.querySelector("ofiuco-header");
    if (!headerEl) return;

    // Pequeño retraso para garantizar que el Shadow DOM del header esté listo
    setTimeout(() => {
      if (headerEl.shadowRoot) {
        const loginButton = headerEl.shadowRoot.querySelector(
          "ofiuco-login-button",
        );
        if (loginButton) {
          if (mostrar) {
            loginButton.removeAttribute("hidden");
            loginButton.style.display = "";
          } else {
            loginButton.setAttribute("hidden", "");
            loginButton.style.display = "none";
          }
        }
      }
    }, 50);
  }

  // Método dedicado para enlazar directamente el clic del botón de login interno
  #asegurarListenerBotonLogin() {
    setTimeout(() => {
      const headerEl = document.querySelector("ofiuco-header");
      if (!headerEl || !headerEl.shadowRoot) return;

      const loginButton = headerEl.shadowRoot.querySelector(
        "ofiuco-login-button",
      );
      if (loginButton) {
        // Removemos listener previo para evitar duplicados y asignamos el cambio a HU2
        loginButton.onclick = null;
        loginButton.addEventListener(
          "click",
          () => {
            this.cargarLogin();
          },
          { once: true },
        ); // Se ejecuta al hacer clic y se re-asegura al volver a la vista
      }
    }, 80);
  }

  cargarBusquedaCitas() {
    this.#toggleLoginButtonVisibility(true);
    this.#asegurarListenerBotonLogin(); // Conectamos el botón al mostrar la HU1

    const busquedaCitasEl = document.createElement("busqueda-citas");

    busquedaCitasEl.addEventListener("descargar-ticket", (evento) => {
      const { consulta } = evento.detail;
      console.log("Generando ticket para la consulta:", consulta);
    });

    this.#appContainer.replaceChildren(busquedaCitasEl);
  }

  // --- HU2 (Login) ---
  cargarLogin() {
    this.#toggleLoginButtonVisibility(false);

    const loginEl = document.createElement("ofiuco-login");

    loginEl.addEventListener("login-success", (evento) => {
      this.#sesionActual = evento.detail;
      this.cargarDashboard(this.#sesionActual);
    });

    this.#appContainer.replaceChildren(loginEl);
  }

  // --- HU3 (Dashboard) ---
  cargarDashboard(sesion) {
    this.#toggleLoginButtonVisibility(false);

    const dashboardEl = document.createElement("ofiuco-dashboard");

    dashboardEl.addEventListener("logout-requested", () => {
      this.#sesionActual = null;
      this.cargarBusquedaCitas();
    });

    dashboardEl.setSession(sesion);
    this.#appContainer.replaceChildren(dashboardEl);
  }

  // --- HU4 (Atención de Consulta) ---
  cargarAtencionConsulta(consulta) {
    this.#toggleLoginButtonVisibility(false);

    const pageConsultaEl = document.createElement("ofiuco-page-consulta");

    pageConsultaEl.addEventListener(ConsultaEventos.SALIR, () => {
      if (this.#sesionActual) {
        this.cargarDashboard(this.#sesionActual);
      } else {
        this.cargarBusquedaCitas();
      }
    });

    this.#appContainer.replaceChildren(pageConsultaEl);

    // Extraer el idPersonaRol de forma robusta desde la consulta o la sesión actual
    const idPersonaRol =
      (typeof consulta.idPersonaRol === "object"
        ? consulta.idPersonaRol?.idPersonaRol
        : consulta.idPersonaRol) ||
      consulta.idPersonaRolPaciente ||
      this.#sesionActual?.idPersonaRol;

    pageConsultaEl.contexto = {
      idConsulta: consulta.idConsulta,
      idPersonaRol: idPersonaRol,
      idPersonaRolEmpleado:
        this.#sesionActual?.idPersonaRolEmpleado ??
        this.#sesionActual?.idPersonaRol,
    };
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.appRouter = new SPAOrchestrator();
});
