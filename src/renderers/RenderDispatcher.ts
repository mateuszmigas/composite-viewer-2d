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

//CompositeRenderer
export class RenderDispatcher<TRenderPayload> {
  isReady = false; //first resize marks scene as ready
  debugInfo: DebugInfo;
  animationFrameHandle = 0;
  resizeObserveUnsubscribe: Unsubscribe;
  visibleLayers: string[] = [];

  constructor(
    hostElement: HTMLElement,
    private options: Options = defaultOptions,
    private renderers: RendrerMap<TRenderPayload>[]
  ) {
    this.debugInfo = new DebugInfo(hostElement, renderers, options);

    this.resizeObserveUnsubscribe = observeElementBoundingRect(
      hostElement,
      rectangle => this.resize(rectangle)
    );
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

  patchRender() {}

  dispose() {
    this.renderers.forEach(s => s.renderer.dispose());
    this.resizeObserveUnsubscribe();
    cancelAnimationFrame(this.animationFrameHandle);
  }

  private resize(size: Size) {
    this.renderers.forEach(r => r.renderer.setSize(size));
    console.log("first resize");

    this.isReady = true;
  }

  // private requestRender() {
  //   this.animationFrameHandle = requestAnimationFrame(this.renderLoop);
  // }

  // private renderLoop = (time: number) => {
  //   this.debugInfo.onLoopBegin();

  //   this.debugInfo.onLoopEnd();
  //   this.requestRender();
  // };
}
