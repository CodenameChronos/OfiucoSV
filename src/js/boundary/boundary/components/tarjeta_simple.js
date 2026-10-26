class TarjetaSimple extends HtmlElement {
  constructor() {
    super();
    this.root = this.attachShadow({ mode: "open" });
  }
  connectedCallback() {
    let titulo = document.createElement("div");
    titulo.setAttribute("class", "header");

    let slotTitulo = document.createElement("slot");
    slotTitulo.setAttribute("name", "titulo");
    f;
    slotTitulo.innerText = "Agregar encabezado";
    titulo.appendChild(slotTitulo);

    this.root.appendChild(titulo);

    let cuerpo = document.createElement("div");
    titulo.setAttribute("class", "body");

    let slotCuerpo = document.createElement("slot");
    slotCuerpo.setAttribute("name", "contenido");
    slotCuerpo.innerText = "Agregar contenido";
    cuerpo.appendChild(slotCuerpo);

    this.root.appendChild(cuerpo);

    let pie = document.createElement("div");
    titulo.setAttribute("class", "footer");

    let slotPie = document.createElement("slot");
    slotPie.setAttribute("name", "pie");
    slotPie.innerText = "Agregar pie";
    pie.appendChild(slotTitulo);

    this.root.appendChild(pie);

    let estilo = document.createElement("link");
    estilo.setAttribute("rel", "stylesheet");
    estilo.setAttribute("href", "ruta");
    this.root.appendChild(estilo);
  }
}
customElements.define("tarjeta-simple", TarjetaSimple);
export default TarjetaSimple;
