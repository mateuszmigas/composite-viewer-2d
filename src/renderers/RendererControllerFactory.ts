import { RendererExecutionEnvironment } from "./RendererExecutionEnvironment";
import { RenderMode } from "../types/common";
import {
  RenderingPerformanceMonitor,
  RenderingStats,
} from "./RenderingPerformanceMonitor";
import { WebWorkerRendererProxy } from "./WebWorkerRendererProxy";
import { Serializable } from "../types/common";
import { ProxyRenderer } from "../types/proxy";
import { RendererController } from "./RendererController";
import { GenericRender, Renderer } from "./Renderer";
import {
  createRenderSchedulerForMode,
  enhanceWithProfiler,
  RenderScheduler,
} from "./RenderScheduler";
import { RenderBalancerOptions } from "./RenderingBalancer";
import { isOffscreenCanvasSupported } from "../utils/dom";
import { WebWorkerOrchestratedRenderer } from "./WebWorkerOrchestratedRenderer";

export class RendererControllerFactory<TPayload> {
  renderSchedulerFactory: (rendererId: string) => RenderScheduler;

  constructor(
    private options: {
      renderMode: RenderMode;
      profiling?: {
        onRendererStatsUpdated: (
          rendererId: string,
          renderingStats: RenderingStats
        ) => void;
      };
    },
    private workerFactory?: (rendererId: string) => Worker
  ) {
    this.renderSchedulerFactory = (rendererId: string) => {
      const renderScheduler = createRenderSchedulerForMode(options.renderMode);

      return options.profiling
        ? enhanceWithProfiler(
            renderScheduler,
            new RenderingPerformanceMonitor(renderingStats =>
              options.profiling?.onRendererStatsUpdated(
                rendererId,
                renderingStats
              )
            )
          )
        : renderScheduler;
    };
  }

  create<TRendererPayload, TParams extends any[]>(
    id: string,
    contructorFunction: {
      new (
        renderScheduler: RenderScheduler,
        ...otherParams: TParams
      ): GenericRender<TRendererPayload>;
    },
    contructorParams: TParams,
    payloadSelector: (payload: TPayload) => TRendererPayload,
    enabled: boolean
  ): RendererController<TPayload> {
    const controller: RendererController<TPayload> = {
      id,
      renderer: new contructorFunction(
        this.renderSchedulerFactory(id),
        ...contructorParams
      ),
      payloadSelector,
      enabled,
      executionEnvironment: "mainThread",
    };

    controller.renderer.setVisibility(controller.enabled);
    return controller;
  }

  createOffscreenIfAvailable<TRendererPayload, TParams extends any[]>(
    id: string,
    contructorFunction: ProxyRenderer<TRendererPayload, TParams>,
    contructorParams: [HTMLCanvasElement, ...Serializable<TParams>],
    payloadSelector: (payload: TPayload) => TRendererPayload,
    enabled: boolean
  ): RendererController<TPayload> {
    const [renderer, executionEnvironment] = isOffscreenCanvasSupported()
      ? [
          new WebWorkerRendererProxy(
            () => {
              if (!this.workerFactory) {
                throw new Error(
                  "You need to provide workerFactory if you want to use offscreen renderers"
                );
              }
              return this.workerFactory?.(id);
            },
            {
              renderMode: this.options.renderMode,
              profiling: this.options.profiling
                ? {
                    onRendererStatsUpdated: (renderingStats: RenderingStats) =>
                      this.options.profiling?.onRendererStatsUpdated(
                        id,
                        renderingStats
                      ),
                  }
                : undefined,
            },
            contructorFunction,
            contructorParams
          ),
          "webWorker" as RendererExecutionEnvironment,
        ]
      : [
          new contructorFunction(
            this.renderSchedulerFactory(id),
            ...contructorParams
          ),
          "mainThread" as RendererExecutionEnvironment,
        ];

    const controller: RendererController<TPayload> = {
      id,
      renderer,
      payloadSelector,
      enabled,
      executionEnvironment,
    };

    controller.renderer.setVisibility(controller.enabled);
    return controller;
  }

  createOrchestratedOffscreenIfAvailable<
    TRendererPayload,
    TParams extends any[]
  >(
    id: string,
    contructorFunction: ProxyRenderer<TRendererPayload, TParams>,
    contructorParams: [HTMLCanvasElement, ...Serializable<TParams>],
    payloadSelector: (payload: TPayload) => TRendererPayload,
    enabled: boolean,
    balancerOptions: RenderBalancerOptions
  ): RendererController<TPayload> {
    const renderer = isOffscreenCanvasSupported()
      ? new WebWorkerOrchestratedRenderer(
          index => {
            if (!this.workerFactory) {
              throw new Error(
                "You need to provide workerFactory if you want to use offscreen renderers"
              );
            }
            return this.workerFactory(`${id}_${index}`);
          },
          {
            renderMode: this.options.renderMode,
            profiling: this.options.profiling
              ? {
                  onRendererStatsUpdated: (renderingStats: RenderingStats) =>
                    this.options.profiling?.onRendererStatsUpdated(
                      id,
                      renderingStats
                    ),
                }
              : undefined,
            ...balancerOptions,
          },
          contructorFunction,
          contructorParams
        )
      : new contructorFunction(
          this.renderSchedulerFactory(id),
          ...contructorParams
        );

    const controller: RendererController<TPayload> = {
      id,
      renderer,
      payloadSelector,
      enabled,
      executionEnvironment: isOffscreenCanvasSupported()
        ? "orchestratedWebWorkers"
        : "mainThread",
    };

    controller.renderer.setVisibility(controller.enabled);
    return controller;
  }
}
