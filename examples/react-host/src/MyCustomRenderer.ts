import {
  Renderer,
  Size,
  Rectangle,
  Viewport,
  RenderRectangleObject,
  RenderCircleObject,
  IRenderScheduler,
} from "./viewer2d";

export class MyCustomRenderer implements Renderer {
  private canvasContext:
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D;

  private canvasSize: Size = { width: 0, height: 0 };
  private viewport: Viewport = { position: { x: 0, y: 0 }, zoom: 1 };
  animationFrameHandle = 0;

  constructor(
    private renderScheduler: IRenderScheduler,
    private canvas: HTMLCanvasElement | OffscreenCanvas
  ) {
    const context = canvas.getContext("2d");

    if (context === null) throw Error("context is null");

    this.canvasContext = context;
    this.canvasContext.globalCompositeOperation = "destination-over";
    renderScheduler.register(this.renderInt);
  }

  setVisibility(visible: boolean) {
    //this.canvas.style.visibility = visible ? "visible" : "collapse";
  }

  setSize(size: Rectangle): void {
    const canvas = this.getCanvas();
    canvas.width = size.width;
    canvas.height = size.height;
    this.canvasSize = { width: size.width, height: size.height };
    this.renderScheduler.scheduleRender();
  }

  setViewport(viewport: Viewport) {
    this.viewport = { ...viewport };
    this.renderScheduler.scheduleRender();
  }

  payload: any;

  render(renderPayload: {
    rectangles?: RenderRectangleObject[];
    circles?: RenderCircleObject[];
  }): void {
    this.payload = renderPayload;
    this.renderInt();
  }

  renderInt = () => {
    this.clearCanvas();

    if (!this.payload) return;

    this.canvasContext.fillStyle = `rgb(
        ${1},
        ${1},
        ${1})`;
    this.canvasContext.fillRect(100, 100, 200, 300);
  };

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
