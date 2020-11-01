import { Renderer } from "./renderer";
import { Patch } from "../patching/patch";
import {
  RenderingStatsMonitor,
  RenderingStats,
} from "../monitoring/renderingStatsMonitor";
import { generateGuid } from "../utils/guid";
import { Size } from "../utils/commonTypes";
import { PickingOptions, PickingResult } from "../picking";
import {
  ProxyEvent,
  ProxyReturnEvent,
  ProxyReturnEventListener,
  ProxyRendererContructor,
} from "./proxyTypes";
import { hasProperty, assertNever } from "../utils/typeGuards";
import { Serializable } from "../utils/typeMapping";
import {
  createRenderSchedulerByType,
  enhanceWithProfiler,
  RenderSchedulerType,
} from "./renderScheduler";
import { Viewport } from "../manipulation/viewport";

type WebWorkerCompatibleRenderer = ProxyRendererContructor<any, any>;
type ProxyOptions = {
  schedulerType: RenderSchedulerType;
  profiling?: {
    onRendererStatsUpdated: (renderingStats: RenderingStats) => void;
    updateStatsOnFrameCount?: number;
  };
};
type RenderProxyReturnEvent<TPayload> = ProxyReturnEvent<Renderer<TPayload>>;
type RenderProxyReturnEventListener<TPayload> = ProxyReturnEventListener<
  Renderer<TPayload>
>;

type RenderProxyBackEvent = {
  type: "renderingStats";
  data: RenderingStats;
};
type RenderProxyBackEventListener = {
  type: "renderingStats";
  callback: (stats: RenderingStats) => void;
};
type RenderProxyEvent<TPayload> =
  | {
      type: "createRenderer";
      data: [
        offscreenCanvas: OffscreenCanvas,
        rendererType: string,
        rendererParams: unknown[],
        options: {
          schedulerType: RenderSchedulerType;
          enableProfiling: boolean;
          updateStatsOnFrameCount?: number;
        }
      ];
    }
  | ProxyEvent<Renderer<TPayload>>;

export class WebWorkerRendererProxy<TRendererPayload, TParams extends any[]>
  implements Renderer<TRendererPayload> {
  worker: Worker;
  canvas: HTMLCanvasElement;
  eventListeners: { [key: string]: (...args: any) => void } = {};

  constructor(
    workerFactory: () => Worker,
    renderingOptions: ProxyOptions,
    rendererConstructor: ProxyRendererContructor<TRendererPayload, TParams>,
    rendererParams: [HTMLCanvasElement, ...Serializable<TParams>]
  ) {
    const [canvas, ...otherParams] = rendererParams;
    this.canvas = canvas;
    const offscreenCanvas = canvas.transferControlToOffscreen();
    this.worker = workerFactory();

    this.postWorkerMessage(
      {
        type: "createRenderer",
        data: [
          offscreenCanvas,
          rendererConstructor.name,
          otherParams,
          {
            schedulerType: renderingOptions.schedulerType,
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
        type: "renderingStats",
        callback: stats =>
          renderingOptions.profiling?.onRendererStatsUpdated(stats),
      });
    }
  }

  render(renderPayload: TRendererPayload): void {
    this.postWorkerMessage({
      type: "render",
      data: [renderPayload],
    });
  }

  renderPatches(renderPayloadPatches: Patch<TRendererPayload>[]): void {
    this.postWorkerMessage({
      type: "renderPatches",
      data: [renderPayloadPatches],
    });
  }

  setSize(size: Size): void {
    this.postWorkerMessage({ type: "setSize", data: [size] });
  }

  setViewport(viewport: Viewport): void {
    this.postWorkerMessage({
      type: "setViewport",
      data: [viewport],
    });
  }

  setVisibility(visible: boolean): void {
    this.canvas.style.visibility = visible ? "visible" : "collapse";

    this.postWorkerMessage({
      type: "setVisibility",
      data: [visible],
    });
  }

  pickObjects(options: PickingOptions): Promise<PickingResult[]> {
    const id = generateGuid();
    const type = "pickObjects";

    this.postWorkerMessage({
      type,
      data: [options],
      id,
    });

    return new Promise((resolve, reject) => {
      this.listenToCallbackMessage({
        type: "pickObjects",
        id,
        callback: pickingResult => {
          this.removeListener(id);
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
    const id = generateGuid();
    const type = "dispose";

    this.postWorkerMessage({ type, id });

    this.listenToCallbackMessage({
      type,
      id,
      callback: () => {
        Object.keys(this.eventListeners).forEach(key =>
          this.removeListener(key)
        );
        this.worker.terminate();
      },
    });
  }

  private postWorkerMessage(
    event: RenderProxyEvent<TRendererPayload>,
    transfer?: Transferable[]
  ) {
    if (transfer) this.worker.postMessage(event, transfer);
    else this.worker.postMessage(event);
  }

  private listenToMessage(listener: RenderProxyBackEventListener) {
    const { type, callback } = listener;
    const eventCallback = ({
      data: proxyEvent,
    }: {
      data: RenderProxyBackEvent;
    }) => {
      if (proxyEvent.type === type) {
        callback(proxyEvent.data);
      }
    };
    this.eventListeners[generateGuid()] = eventCallback;
    this.worker.addEventListener("message", eventCallback);
  }

  private listenToCallbackMessage(
    listener: RenderProxyReturnEventListener<TRendererPayload>
  ) {
    const { type, id, callback } = listener;

    const eventCallback = ({
      data: proxyEvent,
    }: {
      data: RenderProxyReturnEvent<TRendererPayload>;
    }) => {
      if (proxyEvent.type === type && proxyEvent.id === id) {
        if (hasProperty(proxyEvent, "returnData"))
          callback(proxyEvent.returnData);
        else (callback as () => void)();
      }
    };

    this.eventListeners[generateGuid()] = eventCallback;
    this.worker.addEventListener("message", eventCallback);
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
  rendererConstructors: WebWorkerCompatibleRenderer[]
) => {
  let renderer: Renderer<unknown>;

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
    event: RenderProxyReturnEvent<unknown> | RenderProxyBackEvent
  ) => worker.postMessage(event);

  worker.addEventListener(
    "message",
    ({ data: proxyEvent }: { data: RenderProxyEvent<unknown> }) => {
      switch (proxyEvent.type) {
        case "createRenderer": {
          const [
            offscreenCanvas,
            rendererType,
            rendererParams,
            options,
          ] = proxyEvent.data;

          const rendererConstructor = getRendererConstructor(rendererType);

          const renderScheduler = createRenderSchedulerByType(
            options.schedulerType
          );
          const enhancedRenderScheduler = options.enableProfiling
            ? enhanceWithProfiler(
                renderScheduler,
                new RenderingStatsMonitor(
                  stats => {
                    postWorkerMessage({
                      type: "renderingStats",
                      data: stats,
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
          renderer.setSize(...proxyEvent.data);
          break;
        }
        case "setViewport": {
          renderer.setViewport(...proxyEvent.data);
          break;
        }
        case "setVisibility": {
          renderer.setVisibility(...proxyEvent.data);
          break;
        }
        case "render": {
          renderer.render(...proxyEvent.data);
          break;
        }
        case "renderPatches": {
          renderer.renderPatches(...proxyEvent.data);
          break;
        }
        case "pickObjects": {
          const { type, id, data } = proxyEvent;

          renderer
            .pickObjects(...data)
            .then(result =>
              postWorkerMessage({
                type,
                id,
                returnData: {
                  promiseResolution: "fulfilled",
                  result,
                },
              })
            )
            .catch(error =>
              postWorkerMessage({
                type,
                id,
                returnData: {
                  promiseResolution: "rejected",
                  error,
                },
              })
            );
          break;
        }
        case "dispose": {
          const { type, id } = proxyEvent;

          renderer.dispose();

          postWorkerMessage({
            type,
            id,
          });
          break;
        }
        default:
          assertNever(proxyEvent);
      }
    }
  );
};
