import { applyPatches } from "./../types/patch";
import { hasPropertyInChain } from "../common/typeGuards";
import { PickingOptions, PickingResult } from "../picking";
import { Size, Rectangle } from "../types/geometry";
import { Patch } from "../types/patch";
import { RenderRectangleObject, RenderCircleObject } from "../types/renderItem";
import { Viewport } from "../types/viewport";
import { GenericRender, Renderer } from "./Renderer";
import { RenderScheduler } from "./RenderScheduler";

type RenderPayload = {
  rectangles: RenderRectangleObject[];
  circles: RenderCircleObject[];
  layers: string;
  executionTime: number;
};

export const randomInteger = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1) + min);

const randomColor = () => {
  return {
    r: randomInteger(0, 255),
    g: randomInteger(0, 255),
    b: randomInteger(0, 255),
  };
};

export class Canvas2DSimpleRenderer implements GenericRender<RenderPayload> {
  private canvasContext:
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D;

  private size: Size = { width: 0, height: 0 };
  private viewport: Viewport = { position: { x: 0, y: 0 }, zoom: 1 };
  private isVisible = true;
  scheduleRender: () => void;
  color = randomColor();

  constructor(
    renderScheduler: RenderScheduler,
    private canvas: HTMLCanvasElement | OffscreenCanvas
  ) {
    const context = canvas.getContext("2d");

    if (context === null) throw Error("context is null");

    this.canvasContext = context;
    this.canvasContext.globalCompositeOperation = "destination-over"; //todo check performance

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

  //todo canvas left
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

  payload: RenderPayload | undefined;

  render(renderPayload: RenderPayload) {
    const now = Date.now() - renderPayload.executionTime;
    console.log("now", now);

    this.payload = renderPayload;
    this.scheduleRender();
  }

  renderPatches(renderPayloadPatches: Patch<RenderPayload>[]) {
    if (this.payload) applyPatches(this.payload, renderPayloadPatches);
  }

  renderInt = () => {
    this.clearCanvas();

    if (!this.payload) return;

    const zoom = this.viewport.zoom;
    const { x: xOffset, y: yOffset } = this.viewport.position;

    if (this.payload.rectangles) {
      this.payload.rectangles.forEach((rectangle: any) => {
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

    if (this.payload.circles) {
      //todo
      this.canvasContext.beginPath();
      this.payload.circles.forEach((circle: any) => {
        const x = ~~(xOffset + circle.x * zoom);
        const y = ~~(yOffset + circle.y * zoom);
        this.canvasContext.moveTo(x, y);
        this.canvasContext.arc(x, y, 10, 0, Math.PI * 2);
      });
      this.canvasContext.fillStyle = "black";
      this.canvasContext.fill();
    }
  };

  pickObjects(options: PickingOptions): Promise<PickingResult[]> {
    return Promise.resolve(this.isVisible ? ["a", "b"] : ([] as any));
  }

  dispose(): void {
    console.log("disposing canvas");

    this.clearCanvas();
  }

  private clearCanvas() {
    this.canvasContext.clearRect(0, 0, this.size.width, this.size.height);
  }
}
