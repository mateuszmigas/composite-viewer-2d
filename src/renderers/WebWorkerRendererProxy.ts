import { generateGuid } from "./../utils/common";
import { assertNever } from "./../utils/typeHelpers";
import { Renderer } from "./Renderer";
import { IRenderScheduler, RAFRenderScheduler } from "./RenderScheduler";
import { Canvas2DSimpleRenderer } from "./Canvas2DSimpleRenderer";
import { Size, Viewport } from "../types";
import { isOffscreenCanvasSupported } from "../utils/dom";
import { Serializable } from "./../types/common";
import { PickingOptions, PickingResult } from "../picking";
import {
  ProxyEvent,
  ProxyReturnEvent,
  ProxyReturnEventListener,
} from "../types/proxy";

type WebWorkerRenderer<TParams extends any[]> = {
  new (
    renderScheduler: IRenderScheduler,
    canvas: HTMLCanvasElement | OffscreenCanvas,
    ...otherParams: Serializable<TParams>
  ): Renderer;
};

type WebWorkerCompatibleRenderer = WebWorkerRenderer<any>;

type RenderProxyReturnEvent = ProxyReturnEvent<Renderer>;
type RenderProxyReturnEventListener = ProxyReturnEventListener<Renderer>;
type RenderProxyEvent =
  | {
      methodType: "constructor";
      methodParams: [
        offscreenCanvas: OffscreenCanvas,
        rendererType: string,
        rendererParams: unknown[]
      ];
    }
  | ProxyEvent<Renderer>;

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
        methodType: "constructor",
        methodParams: [offscreenCanvas, rendererConstructor.name, otherParams],
      },
      [offscreenCanvas]
    );
  }

  render(renderPayload: unknown): void {
    this.postWorkerMessage({
      methodType: "render",
      methodParams: [renderPayload],
    });
  }

  setSize(size: Size): void {
    this.postWorkerMessage({ methodType: "setSize", methodParams: [size] });
  }

  setViewport(viewport: Viewport): void {
    this.postWorkerMessage({
      methodType: "setViewport",
      methodParams: [viewport],
    });
  }

  setVisibility(visible: boolean): void {
    this.canvas.style.visibility = visible ? "visible" : "collapse";
    this.postWorkerMessage({
      methodType: "setVisibility",
      methodParams: [visible],
    });
  }

  pickObjects(options: PickingOptions): Promise<PickingResult[]> {
    const methodIdentifier = generateGuid();

    this.postWorkerMessage({
      methodType: "pickObjects",
      methodParams: [options],
      methodIdentifier,
    });

    return new Promise((resolve, reject) => {
      this.listenToWorkerMessage({
        methodType: "pickObjects",
        methodIdentifier,
        methodCallback: pickingResult => {
          if (pickingResult.promiseResolution === "fulfilled") {
            resolve(pickingResult.result);
          } else {
            reject(pickingResult.error);
          }
        },
      });
    });
  }

  dispose(): void {
    this.postWorkerMessage({ methodType: "dispose" });
    this.worker.terminate();
  }

  private postWorkerMessage(
    event: RenderProxyEvent,
    transfer?: Transferable[]
  ) {
    if (transfer) this.worker.postMessage(event, transfer);
    else this.worker.postMessage(event);
  }

  private listenToWorkerMessage(listener: RenderProxyReturnEventListener) {
    const { methodType, methodIdentifier, methodCallback } = listener;
    this.worker.onmessage = ({
      data: proxyEvent,
    }: {
      data: RenderProxyReturnEvent;
    }) => {
      if (
        proxyEvent.methodType === methodType &&
        proxyEvent.methodIdentifier === methodIdentifier
      ) {
        methodCallback(proxyEvent.methodReturnValue);
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

  const postWorkerMessage = (event: RenderProxyReturnEvent) =>
    worker.postMessage(event);

  worker.addEventListener(
    "message",
    ({ data: proxyEvent }: { data: RenderProxyEvent }) => {
      switch (proxyEvent.methodType) {
        case "constructor": {
          const [
            offscreenCanvas,
            rendererType,
            rendererParams,
          ] = proxyEvent.methodParams;

          const rendererConstructor = getRendererConstructor(rendererType);

          renderer = new rendererConstructor(
            new RAFRenderScheduler(),
            offscreenCanvas,
            ...rendererParams
          );
          break;
        }
        case "setSize": {
          renderer.setSize(...proxyEvent.methodParams);
          break;
        }
        case "setViewport": {
          renderer.setViewport(...proxyEvent.methodParams);
          break;
        }
        case "setVisibility": {
          renderer.setVisibility(...proxyEvent.methodParams);
          break;
        }
        case "render": {
          renderer.render(...proxyEvent.methodParams);
          break;
        }
        case "pickObjects": {
          const { methodType, methodParams, methodIdentifier } = proxyEvent;

          renderer
            .pickObjects(...methodParams)
            .then(result =>
              postWorkerMessage({
                methodType,
                methodIdentifier,
                methodReturnValue: {
                  promiseResolution: "fulfilled",
                  result,
                },
              })
            )
            .catch(error =>
              postWorkerMessage({
                methodType,
                methodIdentifier,
                methodReturnValue: {
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
