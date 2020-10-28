import {
  RenderingPerformanceMonitor,
  RenderingStats,
} from "./RenderingPerformanceMonitor";
import { generateGuid } from "./../utils/common";
import { assertNever } from "./../utils/typeHelpers";
import { Renderer } from "./Renderer";
import {
  createRenderSchedulerForMode,
  enhanceWithProfiler,
} from "./RenderScheduler";
import { Canvas2DSimpleRenderer } from "./Canvas2DSimpleRenderer";
import { Size, Viewport } from "../types";
import { RenderMode, Serializable } from "./../types/common";
import { PickingOptions, PickingResult } from "../picking";
import {
  ProxyEvent,
  ProxyReturnEvent,
  ProxyReturnEventListener,
  ProxyRenderer,
} from "../types/proxy";

type WebWorkerCompatibleRenderer = ProxyRenderer<any, any>;
type ProxyOptions = {
  renderMode: RenderMode;
  profiling?: {
    onRendererStatsUpdated: (renderingStats: RenderingStats) => void;
    updateStatsOnFrameCount?: number;
  };
};
type RenderProxyReturnEvent = ProxyReturnEvent<Renderer>;

type RenderProxyReturnEventListener = ProxyReturnEventListener<Renderer>;
const x: RenderProxyReturnEventListener = {
  messageCallback: () => {},
  messageType: "pickObjects",
  messageIdentifier: "3",
};
type RenderProxyBackEvent = {
  messageType: "renderingStats";
  messageData: RenderingStats;
};
type RenderProxyBackEventListener = {
  messageType: "renderingStats";
  messageCallback: (stats: RenderingStats) => void;
};
type RenderProxyEvent =
  | {
      messageType: "createRenderer";
      messageData: [
        offscreenCanvas: OffscreenCanvas,
        rendererType: string,
        rendererParams: unknown[],
        options: {
          renderMode: RenderMode;
          enableProfiling: boolean;
          updateStatsOnFrameCount?: number;
        }
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
  eventListeners: { [key: string]: (...args: any) => void } = {};

  constructor(
    workerFactory: () => Worker,
    renderingOptions: ProxyOptions,
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
          {
            renderMode: renderingOptions.renderMode,
            enableProfiling: !!renderingOptions.profiling,
            updateStatsOnFrameCount:
              renderingOptions.profiling?.updateStatsOnFrameCount,
          },
        ],
      },
      [offscreenCanvas]
    );

    if (renderingOptions.profiling) {
      this.listenToMessage({
        messageType: "renderingStats",
        messageCallback: stats =>
          renderingOptions.profiling?.onRendererStatsUpdated(stats),
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
      // this.listenToCallbackMessage({
      //   messageType: "pickObjects",
      //   messageIdentifier,
      //   messageCallback: pickingResult => {
      //     this.removeListener(messageIdentifier);
      //     if (pickingResult.promiseResolution === "fulfilled") {
      //       resolve(pickingResult.result);
      //     } else {
      //       reject(pickingResult.error);
      //     }
      //   },
      // });
    });
  }

  dispose(): void {
    const messageIdentifier = generateGuid();
    const messageType = "dispose";

    this.postWorkerMessage({ messageType: "dispose" });
    this.listenToCallbackMessage({
      messageType,
      messageIdentifier,
      messageCallback: () => {
        console.log("dispose is back");
      },
    });

    Object.keys(this.eventListeners).forEach(key => this.removeListener(key));
    console.log("terminting");
    //this.worker.terminate();
  }

  private postWorkerMessage(
    event: RenderProxyEvent,
    transfer?: Transferable[]
  ) {
    if (transfer) this.worker.postMessage(event, transfer);
    else this.worker.postMessage(event);
  }

  private listenToMessage(listener: RenderProxyBackEventListener) {
    const { messageType, messageCallback } = listener;
    const callback = ({ data: proxyEvent }: { data: RenderProxyBackEvent }) => {
      if (proxyEvent.messageType === messageType) {
        messageCallback(proxyEvent.messageData);
      }
    };
    this.eventListeners[generateGuid()] = callback;
    this.worker.addEventListener("message", callback);
  }

  private listenToCallbackMessage(listener: RenderProxyReturnEventListener) {
    const { messageType, messageIdentifier, messageCallback } = listener;

    const callback = ({
      data: proxyEvent,
    }: {
      data: RenderProxyReturnEvent;
    }) => {
      console.log("onmessage1", messageIdentifier);
      if (
        proxyEvent.messageType === messageType &&
        proxyEvent.messageIdentifier === messageIdentifier
      ) {
        //messageCallback(proxyEvent.messageReturnValue);
      }
    };

    //  this.eventListeners[messageIdentifier] = callback;
    this.worker.addEventListener("message", callback);
  }

  private removeListener(messageIdentifier: string) {
    this.worker.removeEventListener(
      "message",
      this.eventListeners[messageIdentifier]
    );
    delete this.eventListeners[messageIdentifier];
  }
}

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
            options,
          ] = proxyEvent.messageData;

          const rendererConstructor = getRendererConstructor(rendererType);

          const renderScheduler = createRenderSchedulerForMode(
            options.renderMode
          );
          const enhancedRenderScheduler = options.enableProfiling
            ? enhanceWithProfiler(
                renderScheduler,
                new RenderingPerformanceMonitor(
                  stats => {
                    console.log("posting stats", renderer);

                    postWorkerMessage({
                      messageType: "renderingStats",
                      messageData: stats,
                    });
                  },
                  { updateStatsOnFrameCount: options.updateStatsOnFrameCount }
                )
              )
            : renderScheduler;

          renderer = new rendererConstructor(
            enhancedRenderScheduler,
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
                messageReturnPromise: {
                  promiseResolution: "fulfilled",
                  result,
                },
              })
            )
            .catch(error =>
              postWorkerMessage({
                messageType,
                messageIdentifier,
                messageReturnPromise: {
                  promiseResolution: "rejected",
                  error,
                },
              })
            );
          break;
        }
        case "dispose": {
          const { messageType, messageIdentifier } = proxyEvent;

          renderer.dispose();
          postWorkerMessage({
            messageType,
            messageIdentifier,
          });
          //(renderer as any) = undefined;
          break;
        }
        default:
          assertNever(proxyEvent);
      }
    }
  );
};
