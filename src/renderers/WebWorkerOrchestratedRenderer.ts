import { WebWorkerRendererProxy } from "./WebWorkerRendererProxy";
import { RenderingStats } from "./RenderingPerformanceMonitor";
import { RendererController } from "./RendererController";
import { GenericRender, Renderer } from "./Renderer";
import { PickingOptions, PickingResult } from "../picking";
import { RenderMode, Serializable, Size, Viewport } from "../types";
import { RenderBalancerOptions } from "./RenderingBalancer";
import { isOffscreenCanvasSupported } from "..";
import { ProxyRenderer } from "../types/proxy";

type OrchestratingRendererOptions = {
  renderMode: RenderMode;
  profiling?: {
    onRendererStatsUpdated: (renderingStats: RenderingStats) => void;
  };
} & RenderBalancerOptions;

export class WebWorkerOrchestratedRenderer<
  TRendererPayload,
  TParams extends any[]
> implements GenericRender<TRendererPayload> {
  //balancer: RenderBalancerOptions;
  renderers: {
    readonly renderer: Renderer;
    payloadSelector: (payload: TRendererPayload) => unknown;
  }[];

  //policy
  constructor(
    workerFactory: (index: number) => Worker,
    renderingOptions: OrchestratingRendererOptions,
    rendererConstructor: ProxyRenderer<TRendererPayload, TParams>,
    rendererParams: [HTMLCanvasElement, ...Serializable<TParams>]
  ) {
    const creator = (index: number) => {
      return new WebWorkerRendererProxy(
        () => workerFactory(index),
        {
          renderMode: renderingOptions.renderMode,
          // profiling: this.options.profiling
          //   ? {
          //       onRendererStatsUpdated: (renderingStats: RenderingStats) =>
          //         this.options.profiling?.onRendererStatsUpdated(
          //           id,
          //           renderingStats
          //         ),
          //     }
          //   : undefined,
        },
        rendererConstructor,
        rendererParams
      );
    };
    this.renderers = [{ renderer: creator(0), payloadSelector: a => a }];
    //this.options = renderingOptions;
  }

  private createWorkerRenderer() {}

  render(renderPayload: TRendererPayload): void {
    this.renderers.forEach(r =>
      r.renderer.render(r.payloadSelector(renderPayload))
    );
  }

  setSize(size: Size): void {
    this.forEachRenderer(r => r.setSize(size));
  }

  setViewport(viewport: Viewport): void {
    this.forEachRenderer(r => r.setViewport(viewport));
  }

  setVisibility(visible: boolean): void {
    this.forEachRenderer(r => r.setVisibility(visible));
  }

  async pickObjects(options: PickingOptions): Promise<PickingResult[]> {
    const result = await Promise.all(
      this.renderers.map(r => r.renderer.pickObjects(options))
    );
    return result.flat();
  }

  dispose(): void {
    this.forEachRenderer(r => r.dispose());
  }

  private forEachRenderer(callback: (renderer: Renderer) => void) {
    this.renderers.forEach(r => callback(r.renderer));
  }

  private checkPerformance(): "ok" | "tooFast" | "tooSlow" {
    return "ok";
  }

  private adjustPayload() {
    const performance = this.checkPerformance();
    const renderersCount = this.renderers.length;

    // if (
    //   performance === "tooFast" &&
    //   renderersCount > this.renderingOptions.minRenderers
    // ) {
    //   //merge
    // } else if (
    //   performance === "tooSlow" &&
    //   renderersCount < this.options.maxRenderers
    // ) {
    //   //add more
    // }
  }
}
