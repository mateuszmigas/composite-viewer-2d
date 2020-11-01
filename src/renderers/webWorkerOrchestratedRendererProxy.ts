import { applyPatches, Patch } from "../patching/patch";
import { WebWorkerRendererProxy } from "./webWorkerRendererProxy";
import { RenderingStats } from "../monitoring/renderingStatsMonitor";
import { Renderer } from "./renderer";
import { PickingOptions, PickingResult } from "../picking";
import { Size } from "../utils/commonTypes";
import { Viewport } from "..";
import { isArrayPatch } from "../utils/typeGuards";
import { Nullable, Serializable } from "../utils/typeMapping";
import { ProxyRendererContructor } from "./proxyTypes";
import {
  BalancerField,
  createPayloadsSplitIntoChunks,
  BalancerStats,
  defaultBalancer,
  BalancerOptions,
  BalancerResult,
} from "./renderingBalancer";
import { RendererOptions } from "./rendererOptions";

export type OrchestratorBalancerOptions<TRendererPayload> = BalancerOptions<
  TRendererPayload
> & {
  initialExecutors?: number;
  frequency?: number;
  balancer?: <TRendererPyload>(
    stats: BalancerStats[],
    options: BalancerOptions<TRendererPyload>
  ) => BalancerResult<TRendererPyload>;
};

export type OrchestratorRendererOptions<TRendererPayload> = RendererOptions & {
  balancerOptions: OrchestratorBalancerOptions<TRendererPayload>;
};

const defaultOptions = {
  initialExecutors: 1,
  minExecutors: 1,
  maxExecutors: 4,
  frequency: 5000,
  frameTimeTresholds: {
    tooSlowIfMoreThan: 16,
    tooFastIfLessThan: 5,
  },
  balancer: defaultBalancer,
};

type OrchestratedRenderer<TRendererPayload> = {
  readonly renderer: Renderer<TRendererPayload>;
  readonly canvas: HTMLCanvasElement;
  payloadSelector: (payload: TRendererPayload) => unknown;
  profilerStats: BalancerStats | null;
  balancerStats: BalancerStats | null;
};

export class WebWorkerOrchestratedRendererProxy<
  TRendererPayload,
  TParams extends any[]
> implements Renderer<TRendererPayload> {
  orchestratedRenderers: OrchestratedRenderer<TRendererPayload>[];
  private balancerTimerHandler: number;
  private renderOptions: {
    profiling?: {
      onRendererStatsUpdated: (renderingStats: RenderingStats[]) => void;
    };
    balancerOptions: Required<OrchestratorBalancerOptions<TRendererPayload>>;
  };
  private rendererFactory: (
    index: number,
    payloadSelector: (payload: TRendererPayload) => unknown
  ) => OrchestratedRenderer<TRendererPayload>;

  private stateToReplicate: Nullable<{
    renderPayload: TRendererPayload;
    size: Size;
    viewport: Viewport;
    visible: boolean;
  }> = { renderPayload: null, size: null, viewport: null, visible: null };

  constructor(
    workerFactory: (index: number) => Worker,
    canvasFactory: (index: number) => HTMLCanvasElement,
    renderOptions: OrchestratorRendererOptions<TRendererPayload>,
    rendererConstructor: ProxyRendererContructor<TRendererPayload, TParams>,
    rendererParams: Serializable<TParams>
  ) {
    this.renderOptions = {
      ...renderOptions,
      balancerOptions: {
        ...defaultOptions,
        ...renderOptions.balancerOptions,
      },
    };

    console.log(this.renderOptions, "cc");

    this.rendererFactory = (
      index: number,
      payloadSelector: (payload: TRendererPayload) => unknown
    ) => {
      const canvas = canvasFactory(index);
      const renderer = new WebWorkerRendererProxy(
        () => workerFactory(index),
        {
          schedulerType: renderOptions.schedulerType,
          profiling: {
            onRendererStatsUpdated: (renderingStats: RenderingStats[]) => {
              if (index <= this.orchestratedRenderers.length - 1)
                this.updateStats(index, renderingStats[0]);
            },
          },
        },
        rendererConstructor,
        [canvas, ...rendererParams]
      );

      return {
        renderer,
        payloadSelector,
        canvas,
        profilerStats: null,
        balancerStats: null,
      };
    };

    this.orchestratedRenderers = createPayloadsSplitIntoChunks(
      this.renderOptions.balancerOptions.initialExecutors,
      this.renderOptions.balancerOptions.balancedFields
    ).map((payloadSelector, index) =>
      this.rendererFactory(index, payloadSelector)
    );

    this.balancerTimerHandler = window.setInterval(() => {
      this.runBalancer();
      this.orchestratedRenderers.forEach(r => (r.balancerStats = null));
    }, this.renderOptions.balancerOptions.frequency);
  }

  render(renderPayload: TRendererPayload): void {
    this.stateToReplicate.renderPayload = renderPayload;
    this.orchestratedRenderers.forEach(r =>
      r.renderer.render(r.payloadSelector(renderPayload) as TRendererPayload)
    );
  }

  renderPatches(renderPayloadPatches: Patch<TRendererPayload>[]): void {
    if (!this.stateToReplicate.renderPayload) return;

    applyPatches(this.stateToReplicate.renderPayload, renderPayloadPatches);

    this.orchestratedRenderers.forEach((r, index) =>
      r.renderer.renderPatches(
        index === 0
          ? renderPayloadPatches
          : this.patchesExceptAdd(renderPayloadPatches)
      )
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
      this.orchestratedRenderers.map(r => r.renderer.pickObjects(options))
    );
    return result.flat();
  }

  dispose(): void {
    clearInterval(this.balancerTimerHandler);
    this.forEachRenderer(r => r.dispose());
  }

  private patchesExceptAdd(renderPayloadPatches: Patch<TRendererPayload>[]) {
    return renderPayloadPatches.filter(
      patch =>
        !this.isBalancedField(patch.path) ||
        !isArrayPatch(patch) ||
        patch.op !== "add"
    );
  }

  private isBalancedField(path: keyof TRendererPayload) {
    return this.renderOptions.balancerOptions.balancedFields.includes(
      path as BalancerField<TRendererPayload>
    );
  }

  private rerender() {
    if (this.stateToReplicate.renderPayload)
      this.render(this.stateToReplicate.renderPayload);
  }

  private runBalancer() {
    if (this.orchestratedRenderers.some(r => r.balancerStats === null)) return;

    const result = this.renderOptions.balancerOptions.balancer(
      this.orchestratedRenderers.map(r => r.balancerStats as BalancerStats),
      { ...this.renderOptions.balancerOptions }
    );

    if (!result.needsBalancing) return;

    if (this.orchestratedRenderers.length < result.payloadSelectors.length) {
      const addCount =
        result.payloadSelectors.length - this.orchestratedRenderers.length;

      for (let index = 0; index < addCount; index++) {
        const orchestratedRenderer = this.rendererFactory(
          this.orchestratedRenderers.length,
          () => {}
        );

        if (this.stateToReplicate.visible)
          orchestratedRenderer.renderer.setVisibility(
            this.stateToReplicate.visible
          );
        if (this.stateToReplicate.size)
          orchestratedRenderer.renderer.setSize(this.stateToReplicate.size);
        if (this.stateToReplicate.viewport)
          orchestratedRenderer.renderer.setViewport(
            this.stateToReplicate.viewport
          );

        this.orchestratedRenderers.push(orchestratedRenderer);
      }
    } else if (
      this.orchestratedRenderers.length > result.payloadSelectors.length
    ) {
      const removeCount =
        this.orchestratedRenderers.length - result.payloadSelectors.length;

      for (let index = 0; index < removeCount; index++) {
        const orchestratedRenderer = this.orchestratedRenderers.pop();
        orchestratedRenderer?.renderer.dispose();
        orchestratedRenderer?.canvas.remove();
      }

      this.notifyProfiler();
    }

    this.orchestratedRenderers.forEach(
      (wr, index) =>
        (wr.payloadSelector = result.payloadSelectors[index] as any)
    );

    this.rerender();
  }

  private updateStats(index: number, renderingStats: RenderingStats) {
    const accumulateStats = (ps: BalancerStats) => {
      ps.framesCount++;
      ps.totalRenderTime += renderingStats.averageFrameTime;
      ps.maxFrameTime = Math.max(ps.maxFrameTime, renderingStats.maxFrameTime);
    };

    const emptyStats = {
      framesCount: 0,
      totalRenderTime: 0,
      maxFrameTime: 0,
    };
    this.orchestratedRenderers[index].profilerStats ??= emptyStats;
    this.orchestratedRenderers[index].balancerStats ??= emptyStats;

    accumulateStats(
      this.orchestratedRenderers[index].profilerStats as BalancerStats
    );
    accumulateStats(
      this.orchestratedRenderers[index].balancerStats as BalancerStats
    );

    this.notifyProfiler();
  }

  private notifyProfiler() {
    if (this.orchestratedRenderers.some(r => r.profilerStats === null)) return;

    const stats = this.orchestratedRenderers.map(r => {
      const profilerStats = r.profilerStats as BalancerStats;
      return {
        maxFrameTime: profilerStats.maxFrameTime,
        averageFrameTime:
          profilerStats.totalRenderTime / profilerStats.framesCount,
      };
    });

    this.renderOptions.profiling?.onRendererStatsUpdated(stats);
    this.orchestratedRenderers.forEach(r => (r.profilerStats = null));
  }

  private forEachRenderer(
    callback: (renderer: Renderer<TRendererPayload>) => void
  ) {
    this.orchestratedRenderers.forEach(r => callback(r.renderer));
  }
}
