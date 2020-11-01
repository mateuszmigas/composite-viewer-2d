import * as PIXI from "pixi.js";
import {
  applyPatches,
  Patch,
  PickingOptions,
  PickingResult,
  Rectangle,
  Renderer,
  RenderScheduler,
  Size,
  Viewport,
} from "../viewer2d";
import { EllipseShape, RectangleShape } from "./shapes";

type PixijsRendererPayload = {
  ellipses: EllipseShape[];
};

export class PixijsRendererRenderer implements Renderer<PixijsRendererPayload> {
  private application: PIXI.Application;
  private graphics: PIXI.Graphics;
  private size: Size = { width: 0, height: 0 };
  private viewport: Viewport = { position: { x: 0, y: 0 }, zoom: 1 };
  private isVisible = true;
  private payload: PixijsRendererPayload | null = null;
  private scheduleRender: () => void;

  constructor(
    private renderScheduler: RenderScheduler,
    private element: HTMLDivElement
  ) {
    PIXI.utils.skipHello();
    this.application = new PIXI.Application({
      transparent: true,
      autoStart: false,
    });

    element.appendChild(this.application.view);

    this.graphics = new PIXI.Graphics();
    this.application.stage.addChild(this.graphics);

    this.scheduleRender = () => {
      if (this.payload && this.isVisible) renderScheduler(this.renderInternal);
    };
  }

  setVisibility(visible: boolean) {
    this.isVisible = visible;
    this.element.style.visibility = visible ? "visible" : "collapse";
    this.scheduleRender();
  }

  setSize(size: Rectangle): void {
    this.size = { width: size.width, height: size.height };
    this.application.renderer.resize(this.size.width, this.size.height);
    this.scheduleRender();
  }

  setViewport(viewport: Viewport) {
    this.viewport = { ...viewport };
    this.graphics.position.set(
      this.viewport.position.x,
      this.viewport.position.y
    );
    this.graphics.scale.set(viewport.zoom);

    if (this.payload && this.isVisible)
      this.renderScheduler(() =>
        this.application.renderer.render(this.application.stage)
      );
  }

  render(payload: PixijsRendererPayload) {
    this.payload = payload;
    this.scheduleRender();
  }

  renderPatches(payloadPatches: Patch<PixijsRendererPayload>[]) {
    if (this.payload) {
      applyPatches(this.payload, payloadPatches);
      this.scheduleRender();
    }
  }

  private renderInternal = (time: number) => {
    if (!this.payload) return;

    this.graphics.clear();

    if (this.payload.ellipses) {
      this.payload.ellipses.forEach(ellipse => {
        this.graphics.beginFill(
          PIXI.utils.rgb2hex([
            ellipse.color.r / 256,
            ellipse.color.g / 256,
            ellipse.color.b / 256,
          ])
        );
        this.graphics.drawEllipse(
          ellipse.x,
          ellipse.y,
          ellipse.width,
          ellipse.height
        );

        this.graphics.endFill();
      });
    }

    this.application.renderer.render(this.application.stage);
  };

  pickObjects(options: PickingOptions): Promise<PickingResult[]> {
    return Promise.resolve(this.isVisible ? ["a", "b"] : ([] as any));
  }

  dispose() {}
}
