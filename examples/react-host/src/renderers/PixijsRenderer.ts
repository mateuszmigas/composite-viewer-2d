import * as PIXI from "pixi.js";
import {
  Patch,
  PickingOptions,
  PickingResult,
  Rectangle,
  Renderer,
  RenderRectangleObject,
  RenderScheduler,
  Size,
  Viewport,
} from "../viewer2d";

type PixijsRendererPayload = {
  rectangles: RenderRectangleObject[];
};

export class PixijsRendererRenderer implements Renderer<PixijsRendererPayload> {
  private size: Size = { width: 0, height: 0 };
  private viewport: Viewport = { position: { x: 0, y: 0 }, zoom: 1 };
  private isVisible = true;
  private payload: PixijsRendererPayload | null = null;
  private scheduleRender: () => void;

  constructor(
    renderScheduler: RenderScheduler,
    private element: HTMLDivElement
  ) {
    const app = new PIXI.Application({ transparent: true });

    element.appendChild(app.view);

    const graphics = new PIXI.Graphics();

    // Rectangle
    graphics.beginFill(0xde3249);
    graphics.drawRect(250, 250, 100, 100);
    graphics.endFill();
    app.stage.addChild(graphics);

    this.scheduleRender = () => {
      if (this.payload && this.isVisible) renderScheduler(this.renderInternal);
    };
  }

  setVisibility(visible: boolean) {
    // this.isVisible = visible;
    // if (hasPropertyInChain(this.canvas, "style"))
    //   this.canvas.style.visibility = visible ? "visible" : "collapse";
    // this.scheduleRender();
  }

  //todo canvas left
  setSize(size: Rectangle): void {
    this.size = { width: size.width, height: size.height };
    this.scheduleRender();
  }

  setViewport(viewport: Viewport) {
    this.viewport = { ...viewport };
    this.scheduleRender();
  }

  render(payload: PixijsRendererPayload) {
    // const now = Date.now() - payload.executionTime;
    // console.log("now", now);
    // this.payload = payload;
    // this.scheduleRender();
  }

  renderPatches(payloadPatches: Patch<PixijsRendererPayload>[]) {
    // console.log("patches", payloadPatches, this.payload);
    // if (this.payload) {
    //   applyPatches(this.payload, payloadPatches);
    //   this.scheduleRender();
    // }
  }

  renderInternal = () => {
    //this.clearCanvas();

    if (!this.payload) return;

    // const zoom = this.viewport.zoom;
    // const { x: xOffset, y: yOffset } = this.viewport.position;

    // if (this.payload.rectangles) {
    //   this.payload.rectangles.forEach((rectangle: any) => {
    //     this.canvasContext.fillStyle = `rgb(
    //         ${rectangle.color.r},
    //         ${rectangle.color.g},
    //         ${rectangle.color.b})`;
    //     this.canvasContext.fillRect(
    //       ~~(xOffset + rectangle.x * zoom),
    //       ~~(yOffset + rectangle.y * zoom),
    //       ~~(rectangle.width * zoom),
    //       ~~(rectangle.height * zoom)
    //     );
    //   });
    // }

    // if (this.payload.circles) {
    //   //todo
    //   this.canvasContext.beginPath();
    //   this.payload.circles.forEach((circle: any) => {
    //     const x = ~~(xOffset + circle.x * zoom);
    //     const y = ~~(yOffset + circle.y * zoom);
    //     this.canvasContext.moveTo(x, y);
    //     this.canvasContext.arc(x, y, 10, 0, Math.PI * 2);
    //   });
    //   this.canvasContext.fillStyle = "black";
    //   this.canvasContext.fill();
    // }
  };

  pickObjects(options: PickingOptions): Promise<PickingResult[]> {
    return Promise.resolve(this.isVisible ? ["a", "b"] : ([] as any));
  }

  dispose() {}
}
