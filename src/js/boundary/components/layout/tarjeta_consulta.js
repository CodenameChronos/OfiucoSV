import TarjetaSimple from "./tarjeta_simple.js";

class TarjetaConsulta extends TarjetaSimple {
  constructor() {
    super();
    this.consulta = new Consulta();
    this.tarjeta = new TarjetaSimple();
  }
}
export default TarjetaConsulta;
