import { Nullable } from "./../types/common";
import { repeatNTimes } from "./../common/arrayExtensions";
import { WebWorkerRendererProxy } from "./WebWorkerRendererProxy";
import { RenderingStats } from "./RenderingPerformanceMonitor";
import { GenericRender, Renderer } from "./Renderer";
import { PickingOptions, PickingResult } from "../picking";
import { RenderMode, Serializable, Size, Viewport } from "../types";
import { RenderBalancerOptions } from "./RenderingBalancer";
import { ProxyRenderer } from "../types/proxy";

type OrchestratingRendererOptions = {
  renderMode: RenderMode;
  profiling?: {
    onRendererStatsUpdated: (renderingStats: RenderingStats[]) => void;
  };
  balancerOptions: RenderBalancerOptions;
};

const defaultOptions: Required<RenderBalancerOptions> = {
  adjustPayloadPolicy: "spreadEvenly",
  minExecutors: 1,
  maxExecutors: 8,
  frequency: 5000,
};

type PerformanceStats = {
  framesCount: number;
  totalRenderTime: number;
  maxFrameTime: number;
};

//compositeProxy
export class WebWorkerOrchestratedRenderer<
  TRendererPayload,
  TParams extends any[]
> implements GenericRender<TRendererPayload> {
  renderers: {
    readonly renderer: Renderer;
    payloadSelector: (payload: TRendererPayload) => unknown;
    profilerStats: PerformanceStats | null;
    balancerStats: PerformanceStats | null;
  }[];
  private balancerTimerHandler: number;
  private balancerOptions: Required<RenderBalancerOptions>;
  private rendererFactory: (index: number) => Renderer;

  private stateToReplicate: Nullable<{
    renderPayload: TRendererPayload;
    size: Size;
    viewport: Viewport;
    visible: boolean;
  }> = { renderPayload: null, size: null, viewport: null, visible: null };

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

    this.rendererFactory = (index: number) =>
      new WebWorkerRendererProxy(
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

    this.renderers = repeatNTimes(this.balancerOptions.minExecutors).map(
      index => ({
        renderer: this.rendererFactory(index),
        payloadSelector: a => a,
        profilerStats: null,
        balancerStats: null,
      })
    );

    this.balancerTimerHandler = window.setInterval(
      () => this.runBalancer(),
      this.balancerOptions.frequency
    );
  }

  render(renderPayload: TRendererPayload): void {
    this.stateToReplicate.renderPayload = renderPayload;
    this.renderers.forEach(r =>
      r.renderer.render(r.payloadSelector(renderPayload))
    );
  }

  setSize(size: Size): void {
    this.stateToReplicate.size = size;
    this.forEachRenderer(r => r.setSize(size));
  }

  setViewport(viewport: Viewport): void {
    this.stateToReplicate.viewport = viewport;
    this.forEachRenderer(r => r.setViewport(viewport));
  }

  setVisibility(visible: boolean): void {
    this.stateToReplicate.visible = visible;
    this.forEachRenderer(r => r.setVisibility(visible));
  }

  async pickObjects(options: PickingOptions): Promise<PickingResult[]> {
    const result = await Promise.all(
      this.renderers.map(r => r.renderer.pickObjects(options))
    );
    return result.flat();
  }

  dispose(): void {
    clearInterval(this.balancerTimerHandler);
    this.forEachRenderer(r => r.dispose());
  }

  private runBalancer() {
    if (this.renderers.some(r => r.balancerStats === null)) return;

    console.log("runBalancer");

    if (this.renderers.length >= this.balancerOptions.maxExecutors) return;

    const renderer = this.rendererFactory(this.renderers.length);

    if (this.stateToReplicate.visible)
      renderer.setVisibility(this.stateToReplicate.visible);
    if (this.stateToReplicate.size)
      renderer.setSize(this.stateToReplicate.size);
    if (this.stateToReplicate.viewport)
      renderer.setViewport(this.stateToReplicate.viewport);
    if (this.stateToReplicate.renderPayload)
      renderer.render(this.stateToReplicate.renderPayload);

    this.renderers.forEach(r => (r.balancerStats = null));

    this.renderers.push({
      renderer: renderer,
      payloadSelector: a => a,
      profilerStats: null,
      balancerStats: null,
    });
  }

  private updateStats(index: number, renderingStats: RenderingStats) {
    const accumulateStats = (ps: PerformanceStats) => {
      ps.framesCount++;
      ps.totalRenderTime += renderingStats.averageFrameTime;
      ps.maxFrameTime = Math.max(ps.maxFrameTime, renderingStats.maxFrameTime);
    };

    const emptyStats = {
      framesCount: 0,
      totalRenderTime: 0,
      maxFrameTime: 0,
    };
    this.renderers[index].profilerStats ??= emptyStats;
    this.renderers[index].balancerStats ??= emptyStats;

    accumulateStats(this.renderers[index].profilerStats as PerformanceStats);
    accumulateStats(this.renderers[index].balancerStats as PerformanceStats);

    this.notifyProfiler();
  }

  private notifyProfiler() {
    if (this.renderers.some(r => r.profilerStats === null)) return;

    const stats = this.renderers.map(r => {
      const profilerStats = r.profilerStats as PerformanceStats;
      return {
        maxFrameTime: profilerStats.maxFrameTime,
        averageFrameTime:
          profilerStats.totalRenderTime / profilerStats.framesCount,
      };
    });

    this.options.profiling?.onRendererStatsUpdated(stats);
    this.renderers.forEach(r => (r.profilerStats = null));
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
