import { assertNever } from "./../utils/typeHelpers";
import { Renderer } from "./Renderer";
import { IRenderScheduler, RAFRenderScheduler } from "./RenderScheduler";
import { Canvas2DSimpleRenderer } from "./Canvas2DSimpleRenderer";
import { Size, Viewport } from "../types";
import { isOffscreenCanvasSupported } from "../utils/dom";
import { Serializable } from "./../types/common";

const defaultRendererConstructors: WebWorkerCompatibleCanvasConstructor<
  any
>[] = [Canvas2DSimpleRenderer];

type RenderProxyEvent =
  | {
      type: "constructor";
      data: {
        offscreenCanvas: OffscreenCanvas;
        rendererType: string;
        rendererParams: any[];
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

type WebWorkerCompatibleCanvasConstructor<T extends any[]> = {
  new (
    renderScheduler: IRenderScheduler,
    canvas: HTMLCanvasElement | OffscreenCanvas,
    ...otherParams: Serializable<T>
  ): Renderer;
};

export class WebWorkerRendererProxy<T extends any[]> implements Renderer {
  worker: Worker;

  constructor(
    workerFactory: () => Worker,
    rendererConstructor: WebWorkerCompatibleCanvasConstructor<T>,
    rendererParams: [HTMLCanvasElement, ...Serializable<T>]
  ) {
    this.worker = workerFactory();
    const [canvas, ...otherParams] = rendererParams;
    const offscreenCanvas = canvas.transferControlToOffscreen();

    console.log(" hehe", rendererConstructor.name);

    this.worker.postMessage(
      {
        type: "constructor",
        data: {
          offscreenCanvas,
          rendererType: rendererConstructor.name,
          rendererParams: otherParams,
        },
      },
      [offscreenCanvas]
    );
  }

  render(time: number, renderPayload: any): void {
    this.worker.postMessage({ type: "render", time, renderPayload });
  }

  setSize(size: Size): void {
    this.worker.postMessage({ type: "setSize", size });
  }

  setViewport(viewport: Viewport): void {
    this.worker.postMessage({ type: "setViewport", viewport });
  }

  setVisibility(visible: boolean): void {
    //this.canvas.style.visibility = visible ? "visible" : "collapse";
  }

  dispose(): void {
    this.worker.postMessage({ type: "dispose" });
    this.worker.terminate();
  }
}

export const tryCreateProxy = <T extends any[]>(
  workerFactory: () => Worker,
  rendererConstructor: WebWorkerCompatibleCanvasConstructor<T>,
  rendererParams: [HTMLCanvasElement, ...Serializable<T>]
) => {
  if (isOffscreenCanvasSupported()) {
    return new WebWorkerRendererProxy(
      workerFactory,
      rendererConstructor,
      rendererParams
    );
  } else {
    return new rendererConstructor(new RAFRenderScheduler(), ...rendererParams);
  }
};

export const exposeToProxy = (
  worker: Worker,
  customRendererConstructors: WebWorkerCompatibleCanvasConstructor<any>[]
) => {
  let internalRenderer: Renderer;
  const rendererConstructors = [
    ...defaultRendererConstructors,
    ...customRendererConstructors,
  ];

  const getRendererConstructor = (
    rendererName: string
  ): WebWorkerCompatibleCanvasConstructor<any> => {
    for (const constructor of rendererConstructors) {
      if (rendererName === constructor.name) {
        return constructor;
      }
    }

    throw new Error(
      "Unsupported renderer. Make sure to expose constructor in exposeToProxy params"
    );
  };

  worker.addEventListener(
    "message",
    ({ data: proxyEvent }: { data: RenderProxyEvent }) => {
      switch (proxyEvent.type) {
        case "constructor": {
          const rendererConstructor = getRendererConstructor(
            proxyEvent.data.rendererType
          );

          internalRenderer = new rendererConstructor(
            new RAFRenderScheduler(),
            proxyEvent.data.offscreenCanvas,
            ...proxyEvent.data.rendererParams
          );
          break;
        }
        case "setSize": {
          internalRenderer.setSize(proxyEvent.size);
          break;
        }
        case "setViewport": {
          internalRenderer.setViewport(proxyEvent.viewport);
          break;
        }
        case "render": {
          internalRenderer.render(proxyEvent.time, proxyEvent.renderPayload);
          break;
        }
        default:
          assertNever(proxyEvent);
      }
    }
  );
};
