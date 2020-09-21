import { DebugInfo } from "../debug/domDebugHelpers";
import { RenderMode, Unsubscribe } from "../types/common";
import { Viewport, Rectangle } from "../types/geometry";
import { RendrerMap } from "../types/renderMap";
import { observeElementBoundingRect } from "../utils/dom";

export type Options = {
  renderMode: RenderMode;
};

const defaultOptions: Options = {
  renderMode: "onDemand",
};

export class RenderDispatcher<TRenderPayload> {
  isReady = false; //first resize marks scene as ready
  debugInfo: DebugInfo;
  animationFrameHandle = 0;
  resizeObserveUnsubscribe: Unsubscribe;
  renderPayload: TRenderPayload | null = null;
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
    this.requestRender();
  }

  setViewport(viewport: Viewport) {
    this.renderers.forEach(renderer => {
      renderer.renderer.onViewportChanged(viewport);
    });
  }

  render(renderPayload: TRenderPayload) {
    this.renderPayload = renderPayload;
    this.renderers.forEach(r => (r.renderer.needsRender = true));
  }

  patchRender() {
    //todo
    this.renderers.forEach(r => (r.renderer.needsRender = true));
  }

  dispose() {
    this.renderers.forEach(s => s.renderer.dispose());
    this.resizeObserveUnsubscribe();
    cancelAnimationFrame(this.animationFrameHandle);
  }

  private resize(rectangle: Rectangle) {
    this.renderers.forEach(renderer => renderer.renderer.onResize(rectangle));

    this.isReady = true;
  }

  private requestRender() {
    this.animationFrameHandle = requestAnimationFrame(this.renderLoop);
  }

  private renderLoop = (time: number) => {
    this.debugInfo.onLoopBegin();

    if (this.isReady && this.renderPayload) {
      this.renderers.forEach(renderer => {
        if (
          renderer.enabled &&
          (this.options.renderMode === "continuous" ||
            renderer.renderer.needsRender)
        )
          if (this.renderPayload)
            renderer.renderer.render(
              time,
              renderer.payloadSelector(this.renderPayload)
            );

        renderer.renderer.needsRender = false;
      });
    }

    this.debugInfo.onLoopEnd();
    this.requestRender();
  };
}
