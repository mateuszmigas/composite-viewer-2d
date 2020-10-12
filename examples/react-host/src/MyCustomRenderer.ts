import {
  Renderer,
  IRenderSyncContext,
  InstantRenderSyncContext,
  Size,
  Rectangle,
  Viewport,
  RenderRectangleObject,
  RenderCircleObject,
} from "./viewer2d";

export class MyCustomRenderer implements Renderer {
  private canvasContext:
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D;

  private canvasSize: Size = { width: 0, height: 0 };
  private viewport: Viewport = { position: { x: 0, y: 0 }, zoom: 1 };
  animationFrameHandle = 0;

  constructor(
    private canvas: HTMLCanvasElement | OffscreenCanvas,
    private synchronizationContext: IRenderSyncContext = new InstantRenderSyncContext()
  ) {
    const context = canvas.getContext("2d");

    if (context === null) throw Error("context is null");

    this.canvasContext = context;
    this.canvasContext.globalCompositeOperation = "destination-over";
    synchronizationContext.register(() => this.renderInt());
  }

  setVisibility(visible: boolean) {
    //this.canvas.style.visibility = visible ? "visible" : "collapse";
  }

  setSize(size: Rectangle): void {
    const canvas = this.getCanvas();
    canvas.width = size.width;
    canvas.height = size.height;
    this.canvasSize = { width: size.width, height: size.height };
    this.synchronizationContext.scheduleRender();
  }

  setViewport(viewport: Viewport) {
    this.viewport = { ...viewport };
    this.synchronizationContext.scheduleRender();
  }

  payload: any;

  render(
    time: number,
    renderPayload: {
      rectangles?: RenderRectangleObject[];
      circles?: RenderCircleObject[];
    }
  ): void {
    this.payload = renderPayload;
    this.renderInt();
  }

  renderInt(): void {
    this.clearCanvas();

    if (!this.payload) return;

    this.canvasContext.fillStyle = `rgb(
        ${1},
        ${1},
        ${1})`;
    this.canvasContext.fillRect(100, 100, 200, 300);
  }

  dispose(): void {}

  private clearCanvas() {
    this.canvasContext.clearRect(
      0,
      0,
      this.canvasSize.width,
      this.canvasSize.height
    );
  }

  private getCanvas() {
    return this.canvasContext.canvas;
  }
}
