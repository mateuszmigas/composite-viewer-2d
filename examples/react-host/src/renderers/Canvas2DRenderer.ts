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
  rectangles: RectangleShape[];
  layers: string;
  executionTime: number;
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

  renderInternal = () => {
    if (!this.payload) return;

    this.canvasContext.clearRect(0, 0, this.size.width, this.size.height);

    const zoom = this.viewport.zoom;
    const { x: xOffset, y: yOffset } = this.viewport.position;

    if (this.payload.rectangles) {
      this.payload.rectangles.forEach(rectangle => {
        this.canvasContext.fillStyle = `rgb(
            ${rectangle.color.r},
            ${rectangle.color.g},
            ${rectangle.color.b})`;
        this.canvasContext.fillRect(
          ~~(xOffset + rectangle.x * zoom),
          ~~(yOffset + rectangle.y * zoom),
          ~~(rectangle.width * zoom),
          ~~(rectangle.height * zoom)
        );
      });
    }
  };

  pickObjects(options: PickingOptions): Promise<PickingResult[]> {
    return Promise.resolve(this.isVisible ? ["a", "b"] : ([] as any));
  }

  dispose() {}
}
