import {
  Size,
  Renderer,
  Rectangle,
  Viewport,
  RenderScheduler,
  hasPropertyInChain,
  PickingOptions,
  PickingResult,
  Patch,
  applyPatches,
} from "../viewer2d";
import { RectangleShape } from "./shapes";

type Canvas2DRendererPayload = {
  borders: RectangleShape[];
};

export class Canvas2DRenderer implements Renderer<Canvas2DRendererPayload> {
  private canvasContext:
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D;

  private size: Size = { width: 0, height: 0 };
  private viewport: Viewport = { position: { x: 0, y: 0 }, zoom: 1 };
  private isVisible = true;
  private payload: Canvas2DRendererPayload | null = null;
  private scheduleRender: () => void;

  constructor(
    renderScheduler: RenderScheduler,
    private canvas: HTMLCanvasElement | OffscreenCanvas
  ) {
    const context = canvas.getContext("2d");

    if (context === null) throw Error("context is null");

    this.canvasContext = context;
    this.canvasContext.globalCompositeOperation = "destination-over";

    this.scheduleRender = () => {
      if (this.payload && this.isVisible) renderScheduler(this.renderInternal);
    };
  }

  setVisibility(visible: boolean) {
    this.isVisible = visible;

    if (hasPropertyInChain(this.canvas, "style"))
      this.canvas.style.visibility = visible ? "visible" : "collapse";

    this.scheduleRender();
  }

  setSize(size: Rectangle): void {
    const canvas = this.canvasContext.canvas;
    canvas.width = size.width;
    canvas.height = size.height;
    this.size = { width: size.width, height: size.height };
    this.scheduleRender();
  }

  setViewport(viewport: Viewport) {
    this.viewport = { ...viewport };
    this.scheduleRender();
  }

  render(payload: Canvas2DRendererPayload) {
    this.payload = payload;
    this.scheduleRender();
  }

  renderPatches(payloadPatches: Patch<Canvas2DRendererPayload>[]) {
    if (this.payload) {
      applyPatches(this.payload, payloadPatches);
      this.scheduleRender();
    }
  }

  private renderInternal = () => {
    if (!this.payload) return;

    this.canvasContext.clearRect(0, 0, this.size.width, this.size.height);

    const zoom = this.viewport.zoom;
    const { x: xOffset, y: yOffset } = this.viewport.position;

    if (this.payload.borders) {
      this.canvasContext.fillStyle = `rgb(0,0,0)`;
      this.canvasContext.lineWidth = 5;
      this.payload.borders.forEach(border => {
        this.canvasContext.strokeRect(
          ~~(xOffset + border.x * zoom),
          ~~(yOffset + border.y * zoom),
          ~~(border.width * zoom),
          ~~(border.height * zoom)
        );
      });
    }
  };

  pickObjects(options: PickingOptions): Promise<PickingResult[]> {
    return Promise.resolve(this.isVisible ? ["a", "b"] : ([] as any));
  }

  dispose() {}
}
