import { tryCreateProxy } from "./WebWorkerRendererProxy";
import { Serializable } from "../types/common";
import { ProxyRenderer } from "../types/proxy";
import { RendererController } from "../types/renderMap";
import { GenericRender } from "./Renderer";
import {
  createContinuousRenderScheduler,
  createOnDemandRAFRenderScheduler,
  RenderScheduler,
} from "./RenderScheduler";

export class RendererCollection<TPayload> {
  controllers: RendererController<TPayload>[] = [];

  //render mode
  constructor(private workerFactory: (id: string) => Worker) {}

  addRenderer<TRendererPayload, TParams extends any[]>(
    name: string,
    contructor: {
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
      id: name,
      renderer: new contructor(
        createOnDemandRAFRenderScheduler(),
        ...contructorParams
      ),
      payloadSelector,
      enabled,
    };

    this.controllers.push(controller);
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
        () => this.workerFactory(name),
        {
          enablePerformanceMonitor: false,
        },
        contructorFunction,
        contructorParams
      ),
      payloadSelector,
      enabled,
    };

    this.controllers.push(controller);
  }

  getRenderers(): RendererController<TPayload>[] {
    return this.controllers;
  }
}
