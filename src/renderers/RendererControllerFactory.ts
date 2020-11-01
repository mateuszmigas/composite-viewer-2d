import {
  RenderingStatsMonitor,
  RenderingStats,
} from "../monitoring/renderingStatsMonitor";
import { WebWorkerRendererProxy } from "./webWorkerRendererProxy";
import { ProxyRendererContructor } from "./proxyTypes";
import { RendererController } from "./rendererController";
import { Renderer } from "./renderer";
import {
  createRenderSchedulerByType,
  enhanceWithProfiler,
  RenderSchedulerType,
  RenderScheduler,
} from "./renderScheduler";
import { isOffscreenCanvasSupported } from "../utils/dom";
import {
  OrchestratorBalancerOptions,
  OrchestratorRendererOptions,
  WebWorkerOrchestratedRendererProxy,
} from "./webWorkerOrchestratedRendererProxy";
import { RendererExecutionEnvironment } from "./rendererExecutionEnvironment";
import { generateGuid } from "../utils/guid";
import { Serializable } from "../utils/typeMapping";

export class RendererControllerFactory {
  renderSchedulerFactory: (rendererId: string) => RenderScheduler;

  constructor(
    private options: {
      schedulerType: RenderSchedulerType;
      profiling?: {
        onRendererStatsUpdated: (
          rendererId: string,
          renderingStats: RenderingStats[]
        ) => void;
        updateStatsOnFrameCount?: number;
      };
    },
    private workerFactory?: (rendererId: string) => Worker
  ) {
    this.renderSchedulerFactory = (rendererId: string) => {
      const renderScheduler = createRenderSchedulerByType(
        options.schedulerType
      );

      return options.profiling
        ? enhanceWithProfiler(
            renderScheduler,
            new RenderingStatsMonitor(
              renderingStats =>
                options.profiling?.onRendererStatsUpdated(rendererId, [
                  renderingStats,
                ]),
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
      new (renderScheduler: RenderScheduler, ...otherParams: TParams): Renderer<
        TRendererPayload
      >;
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
    contructorFunction: ProxyRendererContructor<TRendererPayload, TParams>,
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
              schedulerType: this.options.schedulerType,
              profiling: this.options.profiling
                ? {
                    onRendererStatsUpdated: (
                      renderingStats: RenderingStats[]
                    ) =>
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
      renderer: renderer as Renderer<TRendererPayload>,
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
    contructorFunction: ProxyRendererContructor<TRendererPayload, TParams>,
    contructorParams: Serializable<TParams>,
    canvasFactory: (index: number) => HTMLCanvasElement,
    balancerOptions: OrchestratorBalancerOptions<TRendererPayload>,
    enabled: boolean
  ): RendererController<TRendererPayload> {
    const id = generateGuid();
    const renderer = isOffscreenCanvasSupported()
      ? new WebWorkerOrchestratedRendererProxy(
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
            schedulerType: this.options.schedulerType,
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
      renderer: renderer as Renderer<TRendererPayload>,
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
