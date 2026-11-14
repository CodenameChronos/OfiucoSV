import { BaseComponent } from "../../core/base-component.js";
import { defineOnce } from "../../core/define-once.js";
import { h } from "../../core/dom.js";

const stylesUrl = new URL(
  "../../../../resources/styles/components/sidebar.css",
  import.meta.url,
).href;

export class Sidebar extends BaseComponent {
  static styleUrls = [stylesUrl];

  render() {
    const contenedor = h("aside", { class: "sidebar" }, h("slot"));
    this.shadowRoot.append(contenedor);
  }
}

defineOnce("ofiuco-sidebar", Sidebar);
export default Sidebar;
