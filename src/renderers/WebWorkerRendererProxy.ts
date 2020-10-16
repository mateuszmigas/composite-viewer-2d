import { assertNever } from "./../utils/typeHelpers";
import { Renderer } from "./Renderer";
import { IRenderScheduler, RAFRenderScheduler } from "./RenderScheduler";
import { Canvas2DSimpleRenderer } from "./Canvas2DSimpleRenderer";
import { Size, Viewport } from "../types";
import { isOffscreenCanvasSupported } from "../utils/dom";
import { Serializable } from "./../types/common";
import { PickingOptions, PickingResult } from "../picking";
import { v4 as uuidv4 } from "uuid";

type WebWorkerRenderer<TParams extends any[]> = {
  new (
    renderScheduler: IRenderScheduler,
    canvas: HTMLCanvasElement | OffscreenCanvas,
    ...otherParams: Serializable<TParams>
  ): Renderer;
};

type WebWorkerCompatibleRenderer = WebWorkerRenderer<any>;

type PromiseResult<T> =
  | {
      promiseResolution: "fulfilled";
      result: T;
    }
  | {
      promiseResolution: "rejected";
      error: any;
    };

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
      type: "setVisibility";
      data: {
        visible: boolean;
      };
    }
  | {
      type: "render";
      data: {
        renderPayload: Serializable<any>;
      };
    }
  | {
      type: "pickObjects";
      identifier: string;
      data: {
        options: PickingOptions;
      };
    }
  | { type: "dispose" };

type RenderProxyReturnEvent = {
  type: "pickObjects";
  identifier: string;
  data: PromiseResult<PickingResult[]>;
};

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
    this.canvas.style.visibility = visible ? "visible" : "collapse";
    this.postWorkerMessage({
      type: "setVisibility",
      data: { visible },
    });
  }

  pickObjects(options: PickingOptions): Promise<PickingResult[]> {
    const identifier = uuidv4();

    this.postWorkerMessage({
      type: "pickObjects",
      data: { options },
      identifier,
    });

    return new Promise((resolve, reject) => {
      this.listenToWorkerMessage("pickObjects", identifier, pickingResult => {
        if (pickingResult.promiseResolution === "fulfilled") {
          resolve(pickingResult.result);
        } else {
          reject(pickingResult.error);
        }
      });
    });
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

  private listenToWorkerMessage(
    type: RenderProxyReturnEvent["type"],
    identifier: RenderProxyReturnEvent["identifier"],
    callback: (data: RenderProxyReturnEvent["data"]) => void
  ) {
    this.worker.onmessage = ({
      data: proxyEvent,
    }: {
      data: RenderProxyReturnEvent;
    }) => {
      if (proxyEvent.type === type && proxyEvent.identifier === identifier) {
        callback(proxyEvent.data);
      }
    };
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
  let renderer: Renderer;
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

  const postWorkerMessage = (event: RenderProxyReturnEvent) => {
    worker.postMessage(event);
  };

  worker.addEventListener(
    "message",
    ({ data: proxyEvent }: { data: RenderProxyEvent }) => {
      switch (proxyEvent.type) {
        case "constructor": {
          const rendererConstructor = getRendererConstructor(
            proxyEvent.data.rendererType
          );

          renderer = new rendererConstructor(
            new RAFRenderScheduler(),
            proxyEvent.data.offscreenCanvas,
            ...proxyEvent.data.rendererParams
          );
          break;
        }
        case "setSize": {
          renderer.setSize(proxyEvent.data.size);
          break;
        }
        case "setViewport": {
          renderer.setViewport(proxyEvent.data.viewport);
          break;
        }
        case "setVisibility": {
          renderer.setVisibility(proxyEvent.data.visible);
          break;
        }
        case "render": {
          renderer.render(proxyEvent.data.renderPayload);
          break;
        }
        case "pickObjects": {
          renderer
            .pickObjects(proxyEvent.data.options)
            .then(result =>
              postWorkerMessage({
                type: "pickObjects",
                identifier: proxyEvent.identifier,
                data: {
                  promiseResolution: "fulfilled",
                  result,
                },
              })
            )
            .catch(error =>
              postWorkerMessage({
                type: "pickObjects",
                identifier: proxyEvent.identifier,
                data: {
                  promiseResolution: "rejected",
                  error,
                },
              })
            );
        }
        case "dispose": {
          renderer.dispose();
          break;
        }
        default:
          assertNever(proxyEvent);
      }
    }
  );
};
