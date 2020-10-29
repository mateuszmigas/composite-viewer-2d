import { PickingOptions, PickingResult } from "../picking";
import { Unsubscribe } from "../types/common";
import { Size } from "../types/geometry";
import { RendererController } from "./RendererController";
import { Viewport } from "../types/viewport";
import { observeElementBoundingRect } from "../utils/dom";
import { Patch } from "../types/patch";

export class RenderDispatcher<TRenderPayload> {
  isReady = false;
  resizeObserveUnsubscribe: Unsubscribe;

  constructor(
    hostElement: HTMLElement,
    private renderers: RendererController<TRenderPayload>[],
    private onReadyToRender: () => void
  ) {
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

  renderPatches(renderPayloadPatches: Patch<TRenderPayload>[]) {
    //this.renderers.forEach(r => r.renderer.renderPatches)
    // this.renderers.forEach(r =>
    //   r.renderer.render(
    //     r.payloadSelector(renderPayload) as Partial<TRenderPayload>
    //   )
    // );
  }

  async pickObjects(options: PickingOptions): Promise<PickingResult[]> {
    const result = await Promise.all(
      this.renderers.map(r => r.renderer.pickObjects(options))
    );
    return result.flat();
  }

  dispose() {
    this.resizeObserveUnsubscribe();
    this.renderers.forEach(s => s.renderer.dispose());
  }

  private resize(size: Size) {
    this.renderers.forEach(s => s.renderer.setSize(size));

    //first resize
    if (!this.isReady) {
      this.isReady = true;
      this.onReadyToRender();
    }
  }
}
