import {
  RenderingPerformanceMonitor,
  RenderingStats,
} from "./RenderingPerformanceMonitor";
import { generateGuid } from "./../utils/common";
import { assertNever } from "./../utils/typeHelpers";
import { Renderer } from "./Renderer";
import {
  createOnDemandRAFRenderScheduler,
  RenderScheduler,
} from "./RenderScheduler";
import { Canvas2DSimpleRenderer } from "./Canvas2DSimpleRenderer";
import { Size, Viewport } from "../types";
import { isOffscreenCanvasSupported } from "../utils/dom";
import { Serializable } from "./../types/common";
import { PickingOptions, PickingResult } from "../picking";
import {
  ProxyEvent,
  ProxyReturnEvent,
  ProxyReturnEventListener,
  ProxyRenderer,
} from "../types/proxy";

type WebWorkerCompatibleRenderer = ProxyRenderer<any, any>;

type RenderProxyOptions = {
  enablePerformanceMonitor: boolean;
};

type RenderProxyReturnEvent = ProxyReturnEvent<Renderer>;
type RenderProxyReturnEventListener = ProxyReturnEventListener<Renderer>;
type RenderProxyBackEvent = {
  messageType: "renderingStats";
  messageData: RenderingStats;
};

type RenderProxyEvent =
  | {
      messageType: "createRenderer";
      messageData: [
        offscreenCanvas: OffscreenCanvas,
        rendererType: string,
        rendererParams: unknown[],
        options: RenderProxyOptions
      ];
    }
  | ProxyEvent<Renderer>;

const defaultRendererConstructors: WebWorkerCompatibleRenderer[] = [
  Canvas2DSimpleRenderer,
];

export class WebWorkerRendererProxy<TRendererPayload, TParams extends any[]>
  implements Renderer {
  worker: Worker;
  canvas: HTMLCanvasElement;

  constructor(
    workerFactory: () => Worker,
    proxyOptions: RenderProxyOptions,
    rendererConstructor: ProxyRenderer<TRendererPayload, TParams>,
    rendererParams: [HTMLCanvasElement, ...Serializable<TParams>]
  ) {
    const [canvas, ...otherParams] = rendererParams;
    this.canvas = canvas;
    const offscreenCanvas = canvas.transferControlToOffscreen();
    this.worker = workerFactory();

    this.postWorkerMessage(
      {
        messageType: "createRenderer",
        messageData: [
          offscreenCanvas,
          rendererConstructor.name,
          otherParams,
          proxyOptions,
        ],
      },
      [offscreenCanvas]
    );

    if (proxyOptions.enablePerformanceMonitor) {
      this.listenToMessage({
        messageType: "renderingStats",
        messageCallback: stats => {
          console.log("stats lol", stats);
        },
      });
    }
  }

  render(renderPayload: unknown): void {
    this.postWorkerMessage({
      messageType: "render",
      messageData: [renderPayload],
    });
  }

  setSize(size: Size): void {
    this.postWorkerMessage({ messageType: "setSize", messageData: [size] });
  }

  setViewport(viewport: Viewport): void {
    this.postWorkerMessage({
      messageType: "setViewport",
      messageData: [viewport],
    });
  }

  setVisibility(visible: boolean): void {
    this.canvas.style.visibility = visible ? "visible" : "collapse";
    this.postWorkerMessage({
      messageType: "setVisibility",
      messageData: [visible],
    });
  }

  pickObjects(options: PickingOptions): Promise<PickingResult[]> {
    const messageIdentifier = generateGuid();
    const messageType = "pickObjects";

    this.postWorkerMessage({
      messageType,
      messageData: [options],
      messageIdentifier,
    });

    return new Promise((resolve, reject) => {
      this.listenToCallbackMessage({
        messageType,
        messageIdentifier,
        messageCallback: pickingResult => {
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
    this.postWorkerMessage({ messageType: "dispose" });
    this.worker.terminate();
  }

  private postWorkerMessage(
    event: RenderProxyEvent,
    transfer?: Transferable[]
  ) {
    if (transfer) this.worker.postMessage(event, transfer);
    else this.worker.postMessage(event);
  }

  private listenToMessage(listener: {
    messageType: "renderingStats";
    messageCallback: (stats: RenderingStats) => void;
  }) {
    const { messageType, messageCallback } = listener;
    this.worker.onmessage = ({
      data: proxyEvent,
    }: {
      data: RenderProxyBackEvent;
    }) => {
      if (proxyEvent.messageType === messageType) {
        messageCallback(proxyEvent.messageData);
      }
    };
  }

  private listenToCallbackMessage(listener: RenderProxyReturnEventListener) {
    const { messageType, messageIdentifier, messageCallback } = listener;
    this.worker.onmessage = ({
      data: proxyEvent,
    }: {
      data: RenderProxyReturnEvent;
    }) => {
      if (
        proxyEvent.messageType === messageType &&
        proxyEvent.messageIdentifier === messageIdentifier
      ) {
        messageCallback(proxyEvent.messageReturnValue);
      }
    };
  }
}

export const tryCreateProxy = <TRendererPayload, TParams extends any[]>(
  workerFactory: () => Worker,
  proxyOptions: RenderProxyOptions,
  rendererConstructor: ProxyRenderer<TRendererPayload, TParams>,
  rendererParams: [HTMLCanvasElement, ...Serializable<TParams>]
) => {
  if (isOffscreenCanvasSupported()) {
    return new WebWorkerRendererProxy(
      workerFactory,
      proxyOptions,
      rendererConstructor,
      rendererParams
    );
  } else {
    return new rendererConstructor(
      createOnDemandRAFRenderScheduler(),
      ...rendererParams
    );
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

  const postWorkerMessage = (
    event: RenderProxyReturnEvent | RenderProxyBackEvent
  ) => worker.postMessage(event);

  worker.addEventListener(
    "message",
    ({ data: proxyEvent }: { data: RenderProxyEvent }) => {
      switch (proxyEvent.messageType) {
        case "createRenderer": {
          const [
            offscreenCanvas,
            rendererType,
            rendererParams,
            proxyOptions,
          ] = proxyEvent.messageData;

          const rendererConstructor = getRendererConstructor(rendererType);
          const renderScheduler = proxyOptions.enablePerformanceMonitor
            ? createOnDemandRAFRenderScheduler(
                new RenderingPerformanceMonitor((stats: RenderingStats) =>
                  postWorkerMessage({
                    messageType: "renderingStats",
                    messageData: stats,
                  })
                )
              )
            : createOnDemandRAFRenderScheduler();

          renderer = new rendererConstructor(
            renderScheduler,
            offscreenCanvas,
            ...rendererParams
          );
          break;
        }
        case "setSize": {
          renderer.setSize(...proxyEvent.messageData);
          break;
        }
        case "setViewport": {
          renderer.setViewport(...proxyEvent.messageData);
          break;
        }
        case "setVisibility": {
          renderer.setVisibility(...proxyEvent.messageData);
          break;
        }
        case "render": {
          renderer.render(...proxyEvent.messageData);
          break;
        }
        case "pickObjects": {
          const { messageType, messageData, messageIdentifier } = proxyEvent;

          renderer
            .pickObjects(...messageData)
            .then(result =>
              postWorkerMessage({
                messageType,
                messageIdentifier,
                messageReturnValue: {
                  promiseResolution: "fulfilled",
                  result,
                },
              })
            )
            .catch(error =>
              postWorkerMessage({
                messageType,
                messageIdentifier,
                messageReturnValue: {
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
