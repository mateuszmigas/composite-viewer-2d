import { repeatNTimes } from "./../common/arrayExtensions";
import { WebWorkerRendererProxy } from "./WebWorkerRendererProxy";
import { RenderingStats } from "./RenderingPerformanceMonitor";
import { RendererController } from "./RendererController";
import { GenericRender, Renderer } from "./Renderer";
import { PickingOptions, PickingResult } from "../picking";
import { RenderMode, Serializable, Size, Viewport } from "../types";
import {
  AdjustPayloadPolicy,
  RenderBalancerOptions,
} from "./RenderingBalancer";
import { isOffscreenCanvasSupported } from "..";
import { ProxyRenderer } from "../types/proxy";

type OrchestratingRendererOptions = {
  renderMode: RenderMode;
  profiling?: {
    onRendererStatsUpdated: (renderingStats: RenderingStats) => void;
  };
  balancerOptions: RenderBalancerOptions;
};

const defaultOptions: Required<RenderBalancerOptions> = {
  adjustPayloadPolicy: "spreadEvenly",
  minExecutors: 1,
  maxExecutors: 8,
  frequency: 5000,
};

type OrchestratorStats = {
  framesCount: number;
  totalRenderTime: number;
  maxFrameTime: number;
};

export class WebWorkerOrchestratedRenderer<
  TRendererPayload,
  TParams extends any[]
> implements GenericRender<TRendererPayload> {
  renderers: {
    readonly renderer: Renderer;
    payloadSelector: (payload: TRendererPayload) => unknown;
    stats: OrchestratorStats | null;
  }[];
  private checkTimerHandler: number;
  private balancerOptions: Required<RenderBalancerOptions>;
  private rendererFactory: (index: number) => Renderer;

  constructor(
    workerFactory: (index: number) => Worker,
    canvasFactory: (index: number) => HTMLCanvasElement,
    private options: OrchestratingRendererOptions,
    rendererConstructor: ProxyRenderer<TRendererPayload, TParams>,
    rendererParams: Serializable<TParams>
  ) {
    this.balancerOptions = {
      ...defaultOptions,
      ...options.balancerOptions,
    };

    this.rendererFactory = (index: number) => {
      return new WebWorkerRendererProxy(
        () => workerFactory(index),
        {
          renderMode: options.renderMode,
          profiling: options.profiling
            ? {
                onRendererStatsUpdated: (renderingStats: RenderingStats) =>
                  this.updateStats(index, renderingStats),
              }
            : undefined,
        },
        rendererConstructor,
        [canvasFactory(index), ...rendererParams]
      );
    };

    this.renderers = repeatNTimes(this.balancerOptions.minExecutors).map(
      index => ({
        renderer: this.rendererFactory(index),
        payloadSelector: a => a,
        stats: null,
      })
    );

    this.checkTimerHandler = window.setInterval(() => {
      if (this.renderers.every(r => r.stats !== null)) {
        console.log("checking");

        // this.renderers.forEach(r => (r.stats = null));
      }
    }, this.balancerOptions.frequency);
  }

  private updateStats(index: number, renderingStats: RenderingStats) {
    const stats = this.renderers[index].stats ?? {
      framesCount: 0,
      totalRenderTime: 0,
      maxFrameTime: 0,
    };

    stats.framesCount++;
    stats.totalRenderTime += renderingStats.averageFrameTime;
    stats.maxFrameTime = Math.max(
      stats.maxFrameTime,
      renderingStats.maxFrameTime
    );
    this.renderers[index].stats = stats;
    console.log("stats", index, stats);
  }

  private tryTriggerForAll() {
    if (this.renderers.some(r => r.stats === null)) return;

    this.options.profiling?.onRendererStatsUpdated(this.calculateStats()[0]);
  }

  private calculateStats(): RenderingStats[] {
    return this.renderers.map(r => {
      const stats = r.stats as OrchestratorStats;
      return {
        maxFrameTime: stats.maxFrameTime,
        averageFrameTime: stats.totalRenderTime / stats.framesCount,
      };
    });
  }

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
    clearInterval(this.checkTimerHandler);
    this.forEachRenderer(r => r.dispose());
  }

  private addRenderer() {}

  private removeRenderer() {
    if (this.balancerOptions.adjustPayloadPolicy === "spreadEvenly") {
      //remove random
    } else {
      //remove slowest
    }
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
