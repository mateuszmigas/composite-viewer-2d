import { DebugInfo } from "../debug/domDebugHelpers";
import { RenderMode, Unsubscribe } from "../types/common";
import { Rectangle, Size } from "../types/geometry";
import { RendrerMap } from "../types/renderMap";
import { Viewport } from "../types/viewport";
import { observeElementBoundingRect } from "../utils/dom";
import { Renderer } from "./Renderer";

export type Options = {
  renderMode: RenderMode;
  workerFactory?: (name: string) => Worker;
};

const defaultOptions: Options = {
  renderMode: "onDemand",
};

//CompositeRenderer
export class RenderDispatcher<TRenderPayload> {
  isReady = false;
  debugInfo: DebugInfo;
  animationFrameHandle = 0;
  resizeObserveUnsubscribe: Unsubscribe;

  constructor(
    hostElement: HTMLElement,
    private options: Options = defaultOptions,
    private renderers: RendrerMap<TRenderPayload>[],
    private onReadyToRender: () => void
  ) {
    this.debugInfo = new DebugInfo(hostElement, renderers, options);

    this.resizeObserveUnsubscribe = observeElementBoundingRect(
      hostElement,
      rectangle => this.resize(rectangle)
    );

    this.renderers.forEach(r => r.renderer.setVisibility(!!r.enabled));

    this.requestRender();
  }

  setViewport(viewport: Viewport) {
    this.renderers.forEach(r => r.renderer.setViewport(viewport));
  }

  render(renderPayload: TRenderPayload) {
    this.renderers.forEach(r =>
      r.renderer.render(
        r.payloadSelector(renderPayload) as Partial<TRenderPayload>
      )
    );
  }

  patchRender() {
    // this.renderers.forEach(r =>
    //   r.renderer.render(
    //     r.payloadSelector(renderPayload) as Partial<TRenderPayload>
    //   )
    // );
  }

  dispose() {
    this.resizeObserveUnsubscribe();
    this.renderers.forEach(s => s.renderer.dispose());
  }

  private resize(size: Size) {
    this.forEachRenderer(r => r.setSize(size));

    //first resize
    if (!this.isReady) {
      this.isReady = true;
      this.onReadyToRender();
    }
  }

  private forEachRenderer(callback: (renderer: Renderer) => void) {
    this.renderers.forEach(r => callback(r.renderer));
  }

  private requestRender() {
    this.animationFrameHandle = requestAnimationFrame(this.renderLoop);
  }

  private renderLoop = (time: number) => {
    this.debugInfo.onLoopBegin();

    this.debugInfo.onLoopEnd();
    this.requestRender();
  };
}
