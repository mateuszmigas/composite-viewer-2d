import { RenderMode } from "../types/common";
import {
  RenderingPerformanceMonitor,
  RenderingStats,
} from "./RenderingPerformanceMonitor";
import { WebWorkerRendererProxy } from "./WebWorkerRendererProxy";
import { Serializable } from "../types/common";
import { ProxyRenderer } from "../types/proxy";
import { RendererController } from "./RendererController";
import { GenericRender } from "./Renderer";
import {
  createRenderSchedulerForMode,
  enhanceWithProfiler,
  RenderScheduler,
} from "./RenderScheduler";
import { RenderBalancerOptions } from "./RenderingBalancer";
import { isOffscreenCanvasSupported } from "../utils/dom";
import { WebWorkerOrchestratedRenderer } from "./WebWorkerOrchestratedRenderer";
import { RendererExecutionEnvironment } from "./RendererExecutionEnvironment";
import { generateGuid } from "../utils/common";

export class RendererControllerFactory {
  renderSchedulerFactory: (rendererId: string) => RenderScheduler;

  constructor(
    private options: {
      renderMode: RenderMode;
      profiling?: {
        onRendererStatsUpdated: (
          rendererId: string,
          renderingStats: RenderingStats | RenderingStats[]
        ) => void;
        updateStatsOnFrameCount?: number;
      };
    },
    private workerFactory?: (rendererId: string) => Worker
  ) {
    this.renderSchedulerFactory = (rendererId: string) => {
      const renderScheduler = createRenderSchedulerForMode(options.renderMode);

      return options.profiling
        ? enhanceWithProfiler(
            renderScheduler,
            new RenderingPerformanceMonitor(
              renderingStats =>
                options.profiling?.onRendererStatsUpdated(
                  rendererId,
                  renderingStats
                ),
              {
                updateStatsOnFrameCount:
                  options.profiling?.updateStatsOnFrameCount,
              }
            )
          )
        : renderScheduler;
    };
  }

  create<TRendererPayload, TParams extends any[]>(
    contructorFunction: {
      new (
        renderScheduler: RenderScheduler,
        ...otherParams: TParams
      ): GenericRender<TRendererPayload>;
    },
    contructorParams: TParams,
    enabled: boolean
  ): RendererController<TRendererPayload> {
    const id = generateGuid();
    const controller: RendererController<TRendererPayload> = {
      id,
      renderer: new contructorFunction(
        this.renderSchedulerFactory(id),
        ...contructorParams
      ),
      enabled,
      executionEnvironment: { type: "mainThread" },
    };

    controller.renderer.setVisibility(controller.enabled);
    return controller;
  }

  createOffscreenIfAvailable<TRendererPayload, TParams extends any[]>(
    contructorFunction: ProxyRenderer<TRendererPayload, TParams>,
    contructorParams: [HTMLCanvasElement, ...Serializable<TParams>],
    enabled: boolean
  ): RendererController<TRendererPayload> {
    const id = generateGuid();
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
          { type: "webWorker" } as RendererExecutionEnvironment,
        ]
      : [
          new contructorFunction(
            this.renderSchedulerFactory(id),
            ...contructorParams
          ),
          { type: "mainThread" } as RendererExecutionEnvironment,
          ,
        ];

    const controller: RendererController<TRendererPayload> = {
      id,
      renderer,
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
    contructorFunction: ProxyRenderer<TRendererPayload, TParams>,
    contructorParams: Serializable<TParams>,
    canvasFactory: (index: number) => HTMLCanvasElement,
    balancerOptions: RenderBalancerOptions<TRendererPayload>,
    enabled: boolean
  ): RendererController<TRendererPayload> {
    const id = generateGuid();
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
          canvasFactory,
          {
            renderMode: this.options.renderMode,
            profiling: this.options.profiling
              ? {
                  onRendererStatsUpdated: (renderingStats: RenderingStats[]) =>
                    this.options.profiling?.onRendererStatsUpdated(
                      id,
                      renderingStats
                    ),
                }
              : undefined,
            balancerOptions,
          },
          contructorFunction,
          contructorParams
        )
      : new contructorFunction(
          this.renderSchedulerFactory(id),
          canvasFactory(0),
          ...contructorParams
        );

    const controller: RendererController<TRendererPayload> = {
      id,
      renderer,
      enabled,
      executionEnvironment: isOffscreenCanvasSupported()
        ? ({
            type: "orchestratedWebWorkers",
            maxWorkers: balancerOptions.maxExecutors,
          } as RendererExecutionEnvironment)
        : { type: "mainThread" },
    };

    controller.renderer.setVisibility(controller.enabled);
    return controller;
  }
}
