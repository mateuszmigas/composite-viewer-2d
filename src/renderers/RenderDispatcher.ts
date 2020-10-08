import { DebugInfo } from "../debug/domDebugHelpers";
import { RenderMode, Unsubscribe } from "../types/common";
import { Rectangle, Size } from "../types/geometry";
import { RendrerMap } from "../types/renderMap";
import { Viewport } from "../types/viewport";
import { observeElementBoundingRect } from "../utils/dom";

export type Options = {
  renderMode: RenderMode;
  workerFactory?: (name: string) => Worker;
};

const defaultOptions: Options = {
  renderMode: "onDemand",
};

type RendrerMapX<T> = RendrerMap<T> & { needsRender: boolean };

//CompositeRenderer
export class RenderDispatcher<TRenderPayload> {
  isReady = false; //first resize marks scene as ready
  debugInfo: DebugInfo;
  animationFrameHandle = 0;
  resizeObserveUnsubscribe: Unsubscribe;
  renderPayload: TRenderPayload | null = null;
  visibleLayers: string[] = [];
  renderers: RendrerMapX<TRenderPayload>[] = [];

  constructor(
    hostElement: HTMLElement,
    private options: Options = defaultOptions,
    renderersX: RendrerMap<TRenderPayload>[]
  ) {
    this.renderers = renderersX.map(r =>
      Object.assign(r, { needsRender: true })
    );

    this.debugInfo = new DebugInfo(hostElement, renderersX, options);

    this.resizeObserveUnsubscribe = observeElementBoundingRect(
      hostElement,
      rectangle => this.resize(rectangle)
    );
    this.requestRender();
  }

  setViewport(viewport: Viewport) {
    this.renderers.forEach(r => r.renderer.setViewport(viewport));
  }

  render(renderPayload: TRenderPayload) {
    this.renderers.forEach(r =>
      r.renderer.render(0, r.payloadSelector(renderPayload))
    );
    this.renderPayload = renderPayload;
  }

  patchRender() {}

  dispose() {
    this.renderers.forEach(s => s.renderer.dispose());
    this.resizeObserveUnsubscribe();
    cancelAnimationFrame(this.animationFrameHandle);
  }

  private resize(size: Size) {
    this.renderers.forEach(r => r.renderer.setSize(size));
    this.isReady = true;
  }

  private requestRender() {
    this.animationFrameHandle = requestAnimationFrame(this.renderLoop);
  }

  private renderLoop = (time: number) => {
    this.debugInfo.onLoopBegin();

    if (this.isReady && this.renderPayload) {
      //this.render(this.renderPayload);
      //render sync
      //render async synchronized
      //render async not-synchronized
      // this.renderers.forEach(renderer => {
      //   if (
      //     renderer.enabled &&
      //     (this.options.renderMode === "continuous" || renderer.needsRender)
      //   )
      //     if (this.renderPayload) {
      //       // console.log(
      //       //   "requesting render:",
      //       //   renderer.name,
      //       //   new Date().getTime()
      //       // );
      //       renderer.renderer.render(
      //         time,
      //         renderer.payloadSelector(this.renderPayload)
      //       );
      //     }
      //   renderer.needsRender = false;
      // });
    }

    this.debugInfo.onLoopEnd();
    this.requestRender();
  };
}
