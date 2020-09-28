import { Size, Viewport } from "../types";
import { isOffscreenCanvasSupported } from "../utils/dom";
import { Renderer } from "./../types/common";
export class WebWorkerRendererProxy implements Renderer {
  internalRenderer: Renderer;
  worker: Worker | null = null;

  constructor(
    rendererType: {
      new (canvas: HTMLCanvasElement | OffscreenCanvas): Renderer;
    },
    canvas: HTMLCanvasElement,
    workerFactory: () => Worker
  ) {
    const isOffSu = isOffscreenCanvasSupported();
    console.log("isoff", isOffSu);

    if (isOffSu) {
      this.worker = workerFactory();
      const offscreenCanvas = canvas.transferControlToOffscreen();
      this.worker.postMessage(
        { type: "constructor", drawingSurface: offscreenCanvas },
        [offscreenCanvas]
      );
    }
    this.internalRenderer = new rendererType(
      isOffscreenCanvasSupported()
        ? canvas.transferControlToOffscreen()
        : canvas
    );
  }

  render(time: number, renderPayload: any): void {
    if (this.worker)
      this.worker.postMessage({ type: "render", time, renderPayload });
    else this.internalRenderer.render(time, renderPayload);
  }

  setSize(size: Size): void {
    if (this.worker) this.worker.postMessage({ type: "setSize", size });
    else this.internalRenderer.setSize(size);
  }

  setViewport(viewport: Viewport): void {
    if (this.worker) this.worker.postMessage({ type: "setViewport", viewport });
    else this.internalRenderer.setViewport(viewport);
  }

  setVisibility(visible: boolean): void {
    //throw new Error("Method not implemented.");
  }

  dispose(): void {
    if (this.worker) {
      this.worker.postMessage({ type: "dispose" });
      this.worker.terminate();
    } else this.internalRenderer.dispose();
  }

  needsRender: boolean = false;
}
