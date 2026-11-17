/**
 * @file Reglas para asignar quién atiende cada paso de una consulta.
 *
 *  - Un paso que nunca se atendió en la consulta se asigna a alguien del
 *    personal de la clínica (cualquier persona_rol que no sea de paciente),
 *    elegido al azar. Puede salir la misma persona que atendió el paso anterior.
 *  - Un paso que ya se atendió conserva a quien lo atendió, aunque se retroceda
 *    a él o se vuelva a avanzar.
 *
 * Funciones puras: el azar se inyecta para poder probarlas.
 */
import { Estado, parsearEstado } from "./estado_paso.js";

/** Nombre del rol que NO puede atender pasos (se compara sin mayúsculas). */
export const ROL_PACIENTE = "paciente";

const texto = (v) =>
  String(v ?? "")
    .trim()
    .toLowerCase();

/**
 * Un paso "ya se atendió" si alguna vez estuvo en curso: su fila existe y no
 * está en estado Creado (que es el de un paso que aún no empieza).
 * @param {{estado: string|null}|null|undefined} fila fila de consulta_procedimiento_paso
 */
export function fueAtendido(fila) {
  const estado = parsearEstado(fila?.estado);
  return estado !== null && estado !== Estado.CREADO;
}

/**
 * Personal que puede atender un paso: personas con rol distinto de paciente.
 * El backend ya entrega solo personal; este filtro es una segunda defensa y
 * solo actúa cuando el rol llega anidado con nombre. Sin repetidos.
 * @param {{idPersonaRol: string, idRol?: {nombre?: string}|string|null}[]} personaRoles
 * @param {{rolPaciente?: string}} [opciones]
 */
export function candidatosResponsable(
  personaRoles,
  { rolPaciente = ROL_PACIENTE } = {},
) {
  const vistos = new Set();
  return (personaRoles ?? []).filter((pr) => {
    const id = pr?.idPersonaRol;
    if (!id || vistos.has(id)) return false;
    const rol = typeof pr.idRol === "object" ? texto(pr.idRol?.nombre) : "";
    if (rol === texto(rolPaciente)) return false;
    vistos.add(id);
    return true;
  });
}

/**
 * Elige uno al azar.
 * @param {T[]} candidatos
 * @param {() => number} [azar] devuelve un número en [0, 1)
 * @returns {T|null} null si no hay candidatos
 */
export function elegirResponsable(candidatos, azar = Math.random) {
  if (!Array.isArray(candidatos) || candidatos.length === 0) return null;
  const n = Number(azar());
  const indice = Number.isFinite(n) ? Math.floor(n * candidatos.length) : 0;
  return candidatos[Math.min(Math.max(indice, 0), candidatos.length - 1)];
}
