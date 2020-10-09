import { IRenderScheduler, RAFRenderScheduler } from "./RenderScheduler";
import { Canvas2DSimpleRenderer } from "./Canvas2DSimpleRenderer";
import { Size, Viewport } from "../types";
import { isOffscreenCanvasSupported } from "../utils/dom";
import { Renderer, Serializable } from "./../types/common";

export type WebWorkerCompatibleCanvasConstructor<T extends any[]> = {
  new (
    renderScheduler: IRenderScheduler,
    canvas: HTMLCanvasElement | OffscreenCanvas,
    ...otherParams: Serializable<T>
  ): Renderer;
};

export class WebWorkerRendererProxy<T extends any[]> implements Renderer {
  internalRenderer: Renderer | null = null;
  worker: Worker | null = null;

  constructor(
    rendererConstructor: WebWorkerCompatibleCanvasConstructor<T>,
    private canvas: HTMLCanvasElement,
    workerFactory: () => Worker,
    ...otherParams: Serializable<T>
  ) {
    const isOffSu = isOffscreenCanvasSupported();

    if (isOffSu) {
      this.worker = workerFactory();
      const offscreenCanvas = canvas.transferControlToOffscreen();
      try {
        this.worker.postMessage(
          {
            type: "constructor",
            offscreenCanvas,
          },
          [offscreenCanvas]
        );
      } catch (e) {
        console.log(e);
      }
    } else
      this.internalRenderer = new rendererConstructor(
        new RAFRenderScheduler(),
        canvas,
        ...otherParams
      );
  }

  render(time: number, renderPayload: any): void {
    if (this.worker)
      this.worker.postMessage({ type: "render", time, renderPayload });
    else this.internalRenderer?.render(time, renderPayload);
  }

  setSize(size: Size): void {
    if (this.worker) this.worker.postMessage({ type: "setSize", size });
    else this.internalRenderer?.setSize(size);
  }

  setViewport(viewport: Viewport): void {
    if (this.worker) this.worker.postMessage({ type: "setViewport", viewport });
    else this.internalRenderer?.setViewport(viewport);
  }

  setVisibility(visible: boolean): void {
    this.canvas.style.visibility = visible ? "visible" : "collapse";
  }

  dispose(): void {
    if (this.worker) {
      this.worker.postMessage({ type: "dispose" });
      this.worker.terminate();
    } else this.internalRenderer?.dispose();
  }
}

type RendererEvent =
  | {
      type: "constructor";
      offscreenCanvas: OffscreenCanvas;
      rendererType: {
        new (canvas: HTMLCanvasElement | OffscreenCanvas): Renderer;
      };
    }
  | {
      type: "setSize";
      size: Size;
    }
  | { type: "setViewport"; viewport: Viewport }
  | {
      type: "render";
      time: number;
      renderPayload: any;
    };

// const offscreenCapableRenderers: string[] = [typeof Canvas2DSimpleRenderer];
// console.log("off", offscreenCapableRenderers);

export const exposeToProxy = (worker: Worker, customRenderers?: string[]) => {
  let internalRenderer: Renderer;

  worker.addEventListener("message", (event: { data: RendererEvent }) => {
    const eventData = event.data;
    switch (eventData.type) {
      case "constructor": {
        internalRenderer = new Canvas2DSimpleRenderer(
          new RAFRenderScheduler(),
          eventData.offscreenCanvas,
          "fse",
          {
            age: 123,
            //foo: () => console.log("fes"),
          }
        );
        break;
      }
      case "setSize": {
        internalRenderer.setSize(eventData.size);
        break;
      }
      case "setViewport": {
        internalRenderer.setViewport(eventData.viewport);
        break;
      }
      case "render": {
        internalRenderer.render(eventData.time, eventData.renderPayload);
        break;
      }
      default:
        break;
    }
  });
};
