import { Renderer } from "../types/common";
import { Size, Viewport, Rectangle, Position2D } from "../types/geometry";
import { RenderRectangleObject, RenderCircleObject } from "../types/renderItem";
import { createCanvasElement } from "../utils/dom";

export class Canvas2DSimpleRenderer implements Renderer {
  private canvasContext: CanvasRenderingContext2D;
  private canvasSize: Size = { width: 0, height: 0 };
  private viewport: Viewport = { position: { x: 0, y: 0 }, zoom: 1 };
  needsRender: boolean = false;

  constructor(hostElement: HTMLElement) {
    const canvas = createCanvasElement(hostElement, -99);
    const context = canvas.getContext("2d");

    if (context === null) throw Error("context is null");

    this.canvasContext = context;
    this.canvasContext.globalCompositeOperation = "destination-over"; //todo check performance
  }

  setVisibility(visible: boolean) {
    this.canvasContext.canvas.style.visibility = visible
      ? "visible"
      : "collapse";
  }

  //todo canvas left
  onResize(size: Rectangle): void {
    const canvas = this.getCanvas();
    canvas.width = size.width;
    canvas.height = size.height;
    this.canvasSize = { width: size.width, height: size.height };
    this.needsRender = true;
  }

  onViewportChanged(viewport: Viewport) {
    this.viewport = { ...viewport };
    this.needsRender = true;
  }

  render(
    time: number,
    renderPayload: {
      rectangles?: RenderRectangleObject[];
      circles?: RenderCircleObject[];
    }
  ): void {
    this.clearCanvas();

    const zoom = this.viewport.zoom;
    const { x: xOffset, y: yOffset } = this.viewport.position;

    if (renderPayload.rectangles) {
      renderPayload.rectangles.forEach(rectangle => {
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

    if (renderPayload.circles) {
      //todo
      this.canvasContext.beginPath();
      renderPayload.circles.forEach(circle => {
        const x = ~~(xOffset + circle.x * zoom);
        const y = ~~(yOffset + circle.y * zoom);
        this.canvasContext.moveTo(x, y);
        this.canvasContext.arc(x, y, 10, 0, Math.PI * 2);
      });
      this.canvasContext.fillStyle = "black";
      this.canvasContext.fill();
    }
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
