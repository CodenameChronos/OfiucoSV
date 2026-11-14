/**
 * @file Contrato de eventos de sesión.
 *
 * - LOGIN / LOGOUT: los emite quien autentica (la shell/servicio de sesión) y
 *   los escuchan los componentes que muestran el estado (p. ej. Header).
 * - LOGIN_REQUESTED / LOGOUT_REQUESTED: los emiten los controles de UI cuando
 *   el usuario pide iniciar o cerrar sesión; la shell decide qué hacer.
 *
 * Todos viajan por `document` con bubbles y composed, así atraviesan shadow
 * roots sin acoplar componentes entre sí.
 */

/**
 * @typedef {Object} Session
 * @property {string} nombre  Nombre del empleado (obligatorio)
 * @property {string} [rol]   Rol activo
 * @property {string} [clinica] Clínica activa
 */

export const SessionEvents = Object.freeze({
  LOGIN: "ofiuco:session-login",
  LOGOUT: "ofiuco:session-logout",
  LOGIN_REQUESTED: "ofiuco:login-requested",
  LOGOUT_REQUESTED: "ofiuco:logout-requested",
});

/**
 * @param {unknown} value
 * @returns {value is Session}
 */
export function isValidSession(value) {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof value.nombre === "string" &&
    value.nombre.trim() !== ""
  );
}

/** Emite un evento de sesión. `target` es `document` salvo en pruebas. */
export function emitSessionEvent(name, detail = null, target = document) {
  target.dispatchEvent(
    new CustomEvent(name, { detail, bubbles: true, composed: true }),
  );
}

/** @param {Session} session */
export const emitLogin = (session, target) =>
  emitSessionEvent(SessionEvents.LOGIN, session, target);

export const emitLogout = (target) =>
  emitSessionEvent(SessionEvents.LOGOUT, null, target);
