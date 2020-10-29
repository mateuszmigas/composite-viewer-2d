import {
  Renderer,
  Size,
  Rectangle,
  Viewport,
  RenderRectangleObject,
  RenderCircleObject,
  RenderScheduler,
  hasPropertyInChain,
  PickingOptions,
  PickingResult,
} from "./viewer2d";

export class MyCustomRenderer implements Renderer {
  private canvasContext:
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D;

  private size: Size = { width: 0, height: 0 };
  private isVisible = true;
  private viewport: Viewport = { position: { x: 0, y: 0 }, zoom: 1 };
  scheduleRender: () => void;

  constructor(
    renderScheduler: RenderScheduler,
    private canvas: HTMLCanvasElement | OffscreenCanvas
  ) {
    const context = canvas.getContext("2d");

    if (context === null) throw Error("context is null");

    this.canvasContext = context;
    this.canvasContext.globalCompositeOperation = "destination-over";

    this.scheduleRender = () => {
      if (this.payload && this.isVisible) renderScheduler(this.renderInt);
    };
  }

  setVisibility(visible: boolean) {
    this.isVisible = visible;

    if (hasPropertyInChain(this.canvas, "style"))
      this.canvas.style.visibility = visible ? "visible" : "collapse";

    this.scheduleRender();
  }

  setSize(size: Rectangle): void {
    const canvas = this.getCanvas();
    canvas.width = size.width;
    canvas.height = size.height;
    this.size = { width: size.width, height: size.height };

    this.scheduleRender();
  }

  setViewport(viewport: Viewport) {
    this.viewport = { ...viewport };

    this.scheduleRender();
  }

  payload: any;

  render(renderPayload: {
    rectangles?: RenderRectangleObject[];
    circles?: RenderCircleObject[];
  }): void {
    this.payload = renderPayload;
    this.scheduleRender();
  }

  renderPatches(dupa: any) {}

  renderInt = () => {
    this.clearCanvas();

    if (!this.payload) return;

    this.canvasContext.fillStyle = `rgb(
        ${1},
        ${1},
        ${1})`;
    this.canvasContext.fillRect(100, 100, 200, 300);
  };

  pickObjects(options: PickingOptions): Promise<PickingResult[]> {
    return Promise.resolve(["c", "d"] as any);
  }

  dispose(): void {}

  private clearCanvas() {
    this.canvasContext.clearRect(0, 0, this.size.width, this.size.height);
  }

  private getCanvas() {
    return this.canvasContext.canvas;
  }
}
