import {
  IRenderingPerformanceMonitor,
  RenderingPerformanceMonitor,
  RenderingStats,
} from "./RenderingPerformanceMonitor";
import { tryCreateProxy } from "./WebWorkerRendererProxy";
import { Serializable } from "../types/common";
import { ProxyRenderer } from "../types/proxy";
import { RendererController } from "./RendererController";
import { GenericRender } from "./Renderer";
import {
  createContinuousRenderScheduler,
  createOnDemandRAFRenderScheduler,
  enhanceWithProfiler,
  RenderScheduler,
} from "./RenderScheduler";

//todo, different name
export class RendererCollection<TPayload> {
  controllers: RendererController<TPayload>[] = [];
  renderSchedulerFactory: () => RenderScheduler;

  constructor(
    options: {
      renderMode: "onDemand" | "continuous";
      performanceMonitor?: IRenderingPerformanceMonitor;
    },
    private workerFactory?: (id: string) => Worker
  ) {
    this.renderSchedulerFactory = () => {
      const renderScheduler =
        options.renderMode === "continuous"
          ? createContinuousRenderScheduler()
          : createOnDemandRAFRenderScheduler();

      return options.performanceMonitor
        ? enhanceWithProfiler(renderScheduler, options.performanceMonitor)
        : renderScheduler;
    };
  }

  addRenderer<TRendererPayload, TParams extends any[]>(
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
  ) {
    const controller = {
      id,
      renderer: new contructorFunction(
        this.renderSchedulerFactory(),
        ...contructorParams
      ),
      payloadSelector,
      enabled,
    };

    this.prepareAndAddController(controller);
  }

  addOffscreenRenderer<TRendererPayload, TParams extends any[]>(
    name: string,
    contructorFunction: ProxyRenderer<TRendererPayload, TParams>,
    contructorParams: [HTMLCanvasElement, ...Serializable<TParams>],
    payloadSelector: (payload: TPayload) => TRendererPayload,
    enabled: boolean
  ) {
    const controller = {
      id: name,
      renderer: tryCreateProxy(
        () => {
          if (!this.workerFactory) {
            throw new Error(
              "You need to provide workerFactory if you want to use offscreen renderers"
            );
          }
          return this.workerFactory(name);
        },
        {
          enablePerformanceMonitor: true,
        },
        contructorFunction,
        contructorParams
      ),
      payloadSelector,
      enabled,
    };

    this.prepareAndAddController(controller);
  }

  getRenderers(): RendererController<TPayload>[] {
    return this.controllers;
  }

  private prepareAndAddController(controller: RendererController<TPayload>) {
    controller.renderer.setVisibility(controller.enabled);
    this.controllers.push(controller);
  }
}
