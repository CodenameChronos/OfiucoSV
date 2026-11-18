/**
 * @file Reglas para asignar quién atiende cada paso de una consulta.
 *
 * ## Reglas de negocio
 *  - Un paso que nunca se atendió en la consulta se asigna a alguien del
 *    personal de la clínica (cualquier persona_rol que no sea de paciente),
 *    elegido al azar. Puede salir la misma persona que atendió el paso anterior.
 *  - Un paso que ya se atendió conserva a quien lo atendió, aunque se retroceda
 *    a él o se vuelva a avanzar.
 *
 * @typedef {Object} PersonaRol
 * @property {string} idPersonaRol Id del persona_rol.
 * @property {{nombre?: string}|string|null} [idRol] Rol, anidado con nombre o como id suelto.
 *
 * @typedef {Object} FilaPaso
 * Fila de `consulta_procedimiento_paso`.
 * @property {string|null} [estado] Estado del paso (ver `Estado` en `estado_paso.js`).
 */
import { Estado, parsearEstado } from "./estado_paso.js";

/**
 * Nombre del rol que NO puede atender pasos (se compara sin importar
 * mayúsculas ni espacios en los extremos).
 */
export const ROL_PACIENTE = "paciente";

/**
 * Convierte un valor a texto, sin espacios en los extremos y en minúsculas,
 * para comparar nombres de rol.
 *
 * @param {*} v
 * @returns {string}
 */
const texto = (v) =>
  String(v ?? "")
    .trim()
    .toLowerCase();

/**
 * Indica si un paso "ya se atendió": alguna vez estuvo en curso, es decir,
 * su fila existe y no está en estado Creado (el de un paso que aún no empieza).
 *
 * @param {FilaPaso|null|undefined} fila Fila de consulta_procedimiento_paso.
 * @returns {boolean} `false` si no hay fila, si el estado no se reconoce o si es Creado.
 */
export function fueAtendido(fila) {
  const estado = parsearEstado(fila?.estado);
  return estado !== null && estado !== Estado.CREADO;
}

/**
 * Filtra el personal que puede atender un paso: personas con rol distinto
 * de paciente, sin repetidos (se conserva la primera aparición de cada id).
 *
 * El backend ya entrega solo personal; este filtro es una segunda defensa
 * y solo actúa cuando el rol llega anidado con nombre. Si el rol viene como
 * id suelto o sin nombre, la persona se considera válida.
 *
 * @param {PersonaRol[]} personaRoles Lista de persona_rol a filtrar (acepta `null`/`undefined`).
 * @param {{rolPaciente?: string}} [opciones]
 * @param {string} [opciones.rolPaciente=ROL_PACIENTE] Nombre del rol a excluir.
 * @returns {PersonaRol[]} Candidatos válidos, en el orden original.
 * @example
 * candidatosResponsable([
 *   { idPersonaRol: "1", idRol: { nombre: "Médico" } },
 *   { idPersonaRol: "2", idRol: { nombre: "Paciente" } },
 *   { idPersonaRol: "1", idRol: { nombre: "Médico" } },
 * ]);
 * // → [{ idPersonaRol: "1", idRol: { nombre: "Médico" } }]
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
 * Elige un candidato al azar.
 *
 * El generador de azar es inyectable para poder probar la función. Si
 * devuelve algo que no es un número finito se toma el primer candidato, y
 * el índice siempre queda acotado al rango válido de la lista.
 *
 * @template T
 * @param {T[]} candidatos Lista de la que elegir.
 * @param {() => number} [azar=Math.random] Devuelve un número en [0, 1).
 * @returns {T|null} El elegido, o `null` si no hay candidatos (o no es un arreglo).
 * @example
 * elegirResponsable(["a", "b", "c"], () => 0.5); // "b"
 * elegirResponsable([]);                         // null
 */
export function elegirResponsable(candidatos, azar = Math.random) {
  if (!Array.isArray(candidatos) || candidatos.length === 0) return null;
  const n = Number(azar());
  const indice = Number.isFinite(n) ? Math.floor(n * candidatos.length) : 0;
  return candidatos[Math.min(Math.max(indice, 0), candidatos.length - 1)];
}

export function idClinicaDeConsulta(consulta) {
  const aId = (clinica) =>
    typeof clinica === "string" ? clinica : clinica?.idClinica;

  const directa = aId(consulta?.clinica);
  if (directa) return directa;

  const rol = consulta?.idPersonaRol;
  if (rol !== null && typeof rol === "object")
    return aId(rol.idClinica) || null;
  return null;
}
