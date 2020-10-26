import { Nullable } from "./../types/common";
import { createIndexArray } from "./../common/arrayExtensions";
import { WebWorkerRendererProxy } from "./WebWorkerRendererProxy";
import { RenderingStats } from "./RenderingPerformanceMonitor";
import { GenericRender, Renderer } from "./Renderer";
import { PickingOptions, PickingResult } from "../picking";
import { RenderMode, Serializable, Size, Viewport } from "../types";
import { BalancerField, RenderBalancerOptions } from "./RenderingBalancer";
import { ProxyRenderer } from "../types/proxy";

type OrchestratingRendererOptions<TRendererPayload> = {
  renderMode: RenderMode;
  profiling?: {
    onRendererStatsUpdated: (renderingStats: RenderingStats[]) => void;
  };
  balancerOptions: RenderBalancerOptions<TRendererPayload>;
};

export type PerformanceCheckOptions<TRendererPayload> = {
  minExecutors: number;
  maxExecutors: number;
  balancedFields: BalancerField<TRendererPayload>[];
};

const defaultOptions = {
  minExecutors: 1,
  maxExecutors: 8,
  frequency: 5000,
};

type PerformanceStats = {
  framesCount: number;
  totalRenderTime: number;
  maxFrameTime: number;
};

type PerformanceCheckResult<TRendererPayload> =
  | {
      needsBalancing: false;
    }
  | {
      needsBalancing: true;
      payloadSelectors: ((payload: TRendererPayload) => unknown)[];
    };

export class WebWorkerOrchestratedRenderer<
  TRendererPayload,
  TParams extends any[]
> implements GenericRender<TRendererPayload> {
  workerRenderers: {
    readonly renderer: Renderer;
    payloadSelector: (payload: TRendererPayload) => unknown;
    profilerStats: PerformanceStats | null;
    balancerStats: PerformanceStats | null;
  }[];
  private balancerTimerHandler: number;
  private balancerOptions: Required<RenderBalancerOptions<TRendererPayload>>;
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
    private options: OrchestratingRendererOptions<TRendererPayload>,
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

    this.workerRenderers = createEventPayloads(
      this.balancerOptions.minExecutors,
      this.balancerOptions.balancedFields
    ).map((payloadSelector, index) => ({
      renderer: this.rendererFactory(index),
      payloadSelector,
      profilerStats: null,
      balancerStats: null,
    }));

    this.balancerTimerHandler = window.setInterval(() => {
      this.runBalancer();
      this.workerRenderers.forEach(r => (r.balancerStats = null));
    }, this.balancerOptions.frequency);
  }

  render(renderPayload: TRendererPayload): void {
    this.stateToReplicate.renderPayload = renderPayload;
    this.workerRenderers.forEach(r =>
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
      this.workerRenderers.map(r => r.renderer.pickObjects(options))
    );
    return result.flat();
  }

  dispose(): void {
    clearInterval(this.balancerTimerHandler);
    this.forEachRenderer(r => r.dispose());
  }

  private rerender() {
    if (this.stateToReplicate.renderPayload)
      this.render(this.stateToReplicate.renderPayload);
  }

  private runBalancer() {
    if (this.workerRenderers.some(r => r.balancerStats === null)) return;

    console.log("running balancer");

    const result = checkPerformance(
      this.workerRenderers.map(r => r.balancerStats as PerformanceStats),
      //minExecutors: number;
      //maxExecutors: number;
      //balancedFields: BalancerFields<TRendererPayload>;
      {
        minExecutors: this.balancerOptions.minExecutors,
        maxExecutors: this.balancerOptions.maxExecutors,
        balancedFields: this.balancerOptions.balancedFields,
      }
    );

    if (!result.needsBalancing) return;

    if (this.workerRenderers.length < result.payloadSelectors.length) {
      const addCount =
        result.payloadSelectors.length - this.workerRenderers.length;

      console.log("adding ", addCount);

      for (let index = 0; index < addCount; index++) {
        const renderer = this.rendererFactory(this.workerRenderers.length);

        if (this.stateToReplicate.visible)
          renderer.setVisibility(this.stateToReplicate.visible);
        if (this.stateToReplicate.size)
          renderer.setSize(this.stateToReplicate.size);
        if (this.stateToReplicate.viewport)
          renderer.setViewport(this.stateToReplicate.viewport);

        this.workerRenderers.push({
          renderer: renderer,
          payloadSelector: () => {},
          profilerStats: null,
          balancerStats: null,
        });
      }
    } else if (this.workerRenderers.length > result.payloadSelectors.length) {
      const removeCount =
        this.workerRenderers.length - result.payloadSelectors.length;

      console.log("removing ", removeCount);

      for (let index = 0; index < removeCount; index++) {
        const renderer = this.workerRenderers.pop();
        renderer?.renderer.dispose();
      }
    }

    this.workerRenderers.forEach(
      (wr, index) =>
        (wr.payloadSelector = result.payloadSelectors[index] as any)
    );

    this.rerender();
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
    this.workerRenderers[index].profilerStats ??= emptyStats;
    this.workerRenderers[index].balancerStats ??= emptyStats;

    accumulateStats(
      this.workerRenderers[index].profilerStats as PerformanceStats
    );
    accumulateStats(
      this.workerRenderers[index].balancerStats as PerformanceStats
    );

    this.notifyProfiler();
  }

  private notifyProfiler() {
    if (this.workerRenderers.some(r => r.profilerStats === null)) return;

    const stats = this.workerRenderers.map(r => {
      const profilerStats = r.profilerStats as PerformanceStats;
      return {
        maxFrameTime: profilerStats.maxFrameTime,
        averageFrameTime:
          profilerStats.totalRenderTime / profilerStats.framesCount,
      };
    });

    this.options.profiling?.onRendererStatsUpdated(stats);
    this.workerRenderers.forEach(r => (r.profilerStats = null));
  }

  private forEachRenderer(callback: (renderer: Renderer) => void) {
    this.workerRenderers.forEach(r => callback(r.renderer));
  }
}

const createEventPayloads = <TRendererPyload>(
  length: number,
  fields: BalancerField<TRendererPyload>[]
) =>
  createIndexArray(length).map(index => (payload: TRendererPyload) =>
    fields.reduce(
      (result, key) => {
        const value = result[key];

        if (Array.isArray(value))
          Object.assign(result, { [key]: value.chunk(index, length) });

        return result;
      },
      { ...payload }
    )
  );

const checkPerformance = <TRendererPyload>(
  rendererStats: PerformanceStats[],
  options: PerformanceCheckOptions<TRendererPyload>
): PerformanceCheckResult<TRendererPyload> => {
  const averageFps =
    rendererStats.reduce(
      (sum, r) => sum + r.totalRenderTime / r.framesCount,
      0
    ) / rendererStats.length;

  if (averageFps < 5) {
    const newLength = rendererStats.length - 1;
    return newLength < options.minExecutors
      ? { needsBalancing: false }
      : {
          needsBalancing: true,
          payloadSelectors: createEventPayloads(
            newLength,
            options.balancedFields
          ),
        };
  }

  if (averageFps > 0) {
    const newLength = rendererStats.length + 1;
    return newLength > options.maxExecutors
      ? { needsBalancing: false }
      : {
          needsBalancing: true,
          payloadSelectors: createEventPayloads(
            newLength,
            options.balancedFields
          ),
        };
  }

  return {
    needsBalancing: false,
  };
};
