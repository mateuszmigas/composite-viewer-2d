import { RenderMode } from "./../types/common";
import Stats from "stats.js";
import { RendrerMap } from "../types/renderMap";

export class DebugInfo {
  private stats = new Stats();

  constructor(
    hostElement: HTMLElement,
    renderers: RendrerMap<any>[],
    options: { renderMode: RenderMode }
  ) {
    this.stats.showPanel(0);
    this.stats.dom.style.position = "absolute";
    hostElement.appendChild(this.stats.dom);
    const panel = createPanel(renderers, options);
    hostElement.appendChild(panel);
  }
  onLoopBegin() {
    this.stats.begin();
  }
  onLoopEnd() {
    this.stats.end();
  }
}

const createPanel = (
  renderers: RendrerMap<any>[],
  options: { renderMode: RenderMode }
): HTMLElement => {
  const div = document.createElement("div");
  div.style.color = "white";
  div.style.background = "black";
  div.style.width = "fit-content";
  div.style.opacity = "0.75";
  div.style.zIndex = "1000";
  div.style.height = "fit-content";
  div.style.padding = "10px";

  renderers.forEach(r => {
    const input = document.createElement("input");
    input.type = "checkbox";
    input.id = r.name;
    input.checked = r.enabled;
    input.onchange = () => {
      r.enabled = input.checked;
      r.renderer.setVisibility(r.enabled);
    };
    const label = document.createElement("label");
    label.htmlFor = r.name;
    label.textContent = r.name;
    div.appendChild(input);
    div.appendChild(label);
    div.appendChild(document.createElement("br"));
  });

  div.appendChild(document.createElement("br"));
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = options.renderMode === "onDemand";
  input.id = "renderMode";
  input.onchange = () => {
    options.renderMode = input.checked ? "onDemand" : "continuous";
  };

  const label = document.createElement("label");
  label.htmlFor = "renderMode";
  label.textContent = "on demand";
  div.appendChild(input);
  div.appendChild(label);

  return div;
};
