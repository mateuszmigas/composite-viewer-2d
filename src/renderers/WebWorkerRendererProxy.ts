import { assertNever } from "./../utils/typeHelpers";
import { Renderer } from "./Renderer";
import { IRenderScheduler, RAFRenderScheduler } from "./RenderScheduler";
import { Canvas2DSimpleRenderer } from "./Canvas2DSimpleRenderer";
import { Size, Viewport } from "../types";
import { isOffscreenCanvasSupported } from "../utils/dom";
import { Serializable } from "./../types/common";

type WebWorkerRenderer<TParams extends any[]> = {
  new (
    renderScheduler: IRenderScheduler,
    canvas: HTMLCanvasElement | OffscreenCanvas,
    ...otherParams: Serializable<TParams>
  ): Renderer;
};

type WebWorkerCompatibleRenderer = WebWorkerRenderer<any>;

type RenderProxyEvent =
  | {
      type: "constructor";
      data: {
        offscreenCanvas: OffscreenCanvas;
        rendererType: string;
        rendererParams: unknown[];
      };
    }
  | {
      type: "setSize";
      data: {
        size: Size;
      };
    }
  | {
      type: "setViewport";
      data: {
        viewport: Viewport;
      };
    }
  | {
      type: "render";
      data: {
        renderPayload: Serializable<any>;
      };
    }
  | { type: "dispose" };

const defaultRendererConstructors: WebWorkerCompatibleRenderer[] = [
  Canvas2DSimpleRenderer,
];

export class WebWorkerRendererProxy<TParams extends any[]> implements Renderer {
  worker: Worker;
  canvas: HTMLCanvasElement;

  constructor(
    workerFactory: () => Worker,
    rendererConstructor: WebWorkerRenderer<TParams>,
    rendererParams: [HTMLCanvasElement, ...Serializable<TParams>]
  ) {
    const [canvas, ...otherParams] = rendererParams;
    this.canvas = canvas;
    const offscreenCanvas = canvas.transferControlToOffscreen();
    this.worker = workerFactory();

    this.postWorkerMessage(
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

  render(renderPayload: unknown): void {
    this.postWorkerMessage({
      type: "render",
      data: {
        renderPayload,
      },
    });
  }

  setSize(size: Size): void {
    this.postWorkerMessage({ type: "setSize", data: { size } });
  }

  setViewport(viewport: Viewport): void {
    this.postWorkerMessage({ type: "setViewport", data: { viewport } });
  }

  setVisibility(visible: boolean): void {
    console.log("setting visibility");

    this.canvas.style.visibility = visible ? "visible" : "collapse";
  }

  dispose(): void {
    this.postWorkerMessage({ type: "dispose" });
    this.worker.terminate();
  }

  private postWorkerMessage(
    event: RenderProxyEvent,
    transfer?: Transferable[]
  ) {
    if (transfer) this.worker.postMessage(event, transfer);
    else this.worker.postMessage(event);
  }
}

export const tryCreateProxy = <TParams extends any[]>(
  workerFactory: () => Worker,
  rendererConstructor: WebWorkerRenderer<TParams>,
  rendererParams: [HTMLCanvasElement, ...Serializable<TParams>]
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
  customRendererConstructors: WebWorkerCompatibleRenderer[]
) => {
  let internalRenderer: Renderer;
  const rendererConstructors = [
    ...defaultRendererConstructors,
    ...customRendererConstructors,
  ];

  const getRendererConstructor = (
    rendererName: string
  ): WebWorkerCompatibleRenderer => {
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
          internalRenderer.setSize(proxyEvent.data.size);
          break;
        }
        case "setViewport": {
          internalRenderer.setViewport(proxyEvent.data.viewport);
          break;
        }
        case "render": {
          internalRenderer.render(proxyEvent.data.renderPayload);
          break;
        }
        case "dispose": {
          internalRenderer.dispose();
          break;
        }
        default:
          assertNever(proxyEvent);
      }
    }
  );
};
