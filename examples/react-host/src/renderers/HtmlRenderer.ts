import {
  Size,
  Renderer,
  Rectangle,
  Viewport,
  RenderScheduler,
  PickingOptions,
  PickingResult,
  Patch,
  applyPatches,
} from "../viewer2d";
import { TextShape } from "./shapes";

type HtmlRendererPayload = {
  texts: TextShape[];
};

export class HtmlRenderer implements Renderer<HtmlRendererPayload> {
  private isVisible = true;
  private payload: HtmlRendererPayload | null = null;

  constructor(
    private renderScheduler: RenderScheduler,
    private element: HTMLDivElement
  ) {
    this.element.style.pointerEvents = "none";
  }

  setVisibility(visible: boolean) {
    this.isVisible = visible;
    this.element.style.visibility = visible ? "visible" : "collapse";
  }

  setSize(size: Rectangle): void {}

  setViewport(viewport: Viewport) {
    if (this.payload && this.isVisible)
      this.renderScheduler(() => {
        this.element.style.transform = `
                translate(${viewport.position.x}px, ${viewport.position.y}px) 
                scale(${viewport.zoom})
            `;
      });
  }

  render(payload: HtmlRendererPayload) {
    this.payload = payload;
    this.renderInternal();
  }

  renderPatches(payloadPatches: Patch<HtmlRendererPayload>[]) {
    if (this.payload) {
      applyPatches(this.payload, payloadPatches);
      this.renderInternal();
    }
  }

  pickObjects(options: PickingOptions): Promise<PickingResult[]> {
    return Promise.resolve(this.isVisible ? ["a", "b"] : ([] as any));
  }

  dispose() {}

  private addTextElement(textShape: TextShape) {
    const div = document.createElement("div");
    div.innerText = textShape.text;
    div.style.transform = `translate(${textShape.x}px, ${textShape.y}px)`;
    div.style.position = "absolute";
    div.style.fontSize = "28px";
    this.element.appendChild(div);
  }

  private renderInternal = () => {
    if (!this.payload) return;

    this.element.innerText = "";
    this.payload.texts.forEach(t => {
      this.addTextElement(t);
    });
  };
}
