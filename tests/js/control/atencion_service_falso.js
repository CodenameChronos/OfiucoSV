/**
 * Doble en memoria del AtencionService para probar PageConsulta y para la demo
 * manual, sin backend. Respeta el contrato real: cargar/guardarCambios/avanzar/
 * retroceder/finalizar devuelven una vista con la misma forma que el mapper, y
 * las operaciones de escritura aceptan (borrador, { confirmado }).
 *
 * Controles para las pruebas:
 *  - proximoError:    la próxima operación lanza este error.
 *  - avisosPendientes: las escrituras lanzan ConfirmacionRequerida hasta que
 *                      se llamen con { confirmado: true }.
 *  - pausar():        retiene la próxima operación hasta llamar a lo que devuelve.
 *  - llamadas:        historial [{ nombre, borrador, opciones }].
 */
export const CATALOGO = [
  { id: "AAA-1", nombre: "Glucosa" },
  { id: "BBB-2", nombre: "Hemograma" },
  { id: "CCC-3", nombre: "Orina" },
];

export class ConfirmacionRequeridaFalsa extends Error {
  constructor(avisos) {
    super(`${avisos.join(" ")} ¿Desea continuar?`);
    this.name = "ConfirmacionRequerida";
    this.avisos = avisos;
  }
}

const texto = (v) => String(v ?? "").trim();
const clonar = (v) => (v === undefined ? undefined : structuredClone(v));

export class AtencionServiceFalso {
  llamadas = [];
  proximoError = null;
  avisosPendientes = null;

  #pausa = null;
  #indice;
  #completa;
  #catalogo;
  #referencia = "";
  #pasos;

  /**
   * @param {Object} [opciones]
   * @param {number} [opciones.totalPasos=3]
   * @param {number} [opciones.pasoInicial=0] índice base 0
   * @param {Array<{id:string, resultado?:{resultado:string, interpretacion:string}}>} [opciones.ordenes]
   *        órdenes ya guardadas del paso inicial
   * @param {boolean} [opciones.completa=false]
   */
  constructor({
    totalPasos = 3,
    pasoInicial = 0,
    ordenes = [],
    completa = false,
    catalogo = CATALOGO,
  } = {}) {
    this.#catalogo = catalogo;
    this.#indice = pasoInicial;
    this.#completa = completa;
    this.#pasos = Array.from({ length: totalPasos }, () => ({ notas: "", ordenes: [] }));
    this.#pasos[pasoInicial].ordenes = ordenes.map((o) => ({
      id: o.id,
      resultado: o.resultado ?? null,
    }));
  }

  /** Retiene la próxima operación; devuelve la función que la libera. */
  pausar() {
    let liberar;
    this.#pausa = new Promise((resolver) => {
      liberar = resolver;
    });
    return () => {
      this.#pausa = null;
      liberar();
    };
  }

  async cargar(ids) {
    this.llamadas.push({ nombre: "cargar", ids: clonar(ids) });
    await this.#esperar();
    this.#lanzarSiHayError();
    return this.#vista();
  }

  async guardarCambios(borrador, opciones = {}) {
    await this.#escritura("guardarCambios", borrador, opciones);
    this.#aplicar(borrador);
    return this.#vista();
  }

  async avanzar(borrador, opciones = {}) {
    await this.#escritura("avanzar", borrador, opciones);
    if (this.#indice >= this.#pasos.length - 1) throw new Error("No hay paso siguiente");
    this.#aplicar(borrador);
    this.#indice += 1;
    return this.#vista();
  }

  async retroceder(borrador, opciones = {}) {
    await this.#escritura("retroceder", borrador, opciones);
    if (this.#indice === 0) throw new Error("No hay paso anterior");
    this.#aplicar(borrador);
    this.#indice -= 1;
    return this.#vista();
  }

  async finalizar(borrador, opciones = {}) {
    await this.#escritura("finalizar", borrador, opciones);
    if (this.#indice !== this.#pasos.length - 1) throw new Error("Solo se finaliza en el último paso");
    this.#aplicar(borrador);
    this.#completa = true;
    return this.#vista();
  }

  async #esperar() {
    if (this.#pausa) await this.#pausa;
  }

  #lanzarSiHayError() {
    if (this.proximoError) {
      const error = this.proximoError;
      this.proximoError = null;
      throw error;
    }
  }

  async #escritura(nombre, borrador, opciones) {
    this.llamadas.push({ nombre, borrador: clonar(borrador), opciones: clonar(opciones) });
    await this.#esperar();
    this.#lanzarSiHayError();
    if (this.avisosPendientes && !opciones.confirmado) {
      throw new ConfirmacionRequeridaFalsa(this.avisosPendientes);
    }
  }

  #aplicar(borrador) {
    const paso = this.#pasos[this.#indice];
    if (borrador.notas !== undefined) paso.notas = borrador.notas;
    if (borrador.referenciaExterna !== undefined) this.#referencia = borrador.referenciaExterna;

    const deseados = new Set((borrador.examenes ?? []).map((id) => id.toLowerCase()));
    const previas = new Map(paso.ordenes.map((o) => [o.id.toLowerCase(), o]));
    paso.ordenes = this.#catalogo
      .filter((c) => deseados.has(c.id.toLowerCase()))
      .map((c) => {
        const k = c.id.toLowerCase();
        const r = borrador.resultados?.[k];
        let resultado = previas.get(k)?.resultado ?? null;
        if (r !== undefined) {
          resultado =
            texto(r.resultado) || texto(r.interpretacion)
              ? { resultado: r.resultado ?? "", interpretacion: r.interpretacion ?? "" }
              : null;
        }
        return { id: c.id, resultado };
      });
  }

  #vista() {
    const total = this.#pasos.length;
    const i = this.#indice;
    const paso = this.#pasos[i];
    const ordenados = new Set(paso.ordenes.map((o) => o.id.toLowerCase()));
    const nombre = (id) => this.#catalogo.find((c) => c.id === id)?.nombre;

    return {
      completa: this.#completa,
      paciente: {
        idPersona: "1254as-jasd-1783n-kjnds8",
        nombres: "Susana",
        apellidos: "Del Carmen",
        nombreCompleto: "Susana Del Carmen",
        fechaNacimiento: "2006-01-01",
        edad: 20,
      },
      referenciaExterna: this.#referencia,
      pasos: this.#pasos.map((_, n) => ({
        id: `paso-${n + 1}`,
        nombre: `Paso ${n + 1}`,
        estado: n < i ? "finalizado" : "en_curso",
        actual: n === i,
      })),
      paso: {
        id: `paso-${i + 1}`,
        nombre: `Paso ${i + 1} del procedimiento`,
        numero: i + 1,
        total,
        estado: "en_curso",
        editable: !this.#completa,
        puedeAvanzar: !this.#completa && i < total - 1,
        puedeRetroceder: !this.#completa && i > 0,
        puedeFinalizar: !this.#completa && i === total - 1,
      },
      notas: paso.notas,
      examenes: this.#catalogo.map((c) => ({
        idProcedimientoPasoExamen: c.id,
        idExamen: c.id,
        nombre: c.nombre,
        ordenado: ordenados.has(c.id.toLowerCase()),
      })),
      ordenes: paso.ordenes.map((o) => ({
        idOrdenExamen: `orden-${o.id}`,
        idProcedimientoPasoExamen: o.id,
        nombre: nombre(o.id),
        resultado: o.resultado
          ? {
              idExamenResultado: `res-${o.id}`,
              resultado: o.resultado.resultado,
              interpretacion: o.resultado.interpretacion,
            }
          : null,
      })),
    };
  }
}
