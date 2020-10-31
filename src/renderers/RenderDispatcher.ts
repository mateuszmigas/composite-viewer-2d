import { PickingOptions, PickingResult } from "../picking";
import { Unsubscribe } from "../types/common";
import { Size } from "../types/geometry";
import { RendererController } from "./RendererController";
import { Viewport } from "../types/viewport";
import { observeElementBoundingRect } from "../utils/dom";
import { Patch } from "../types/patch";
import { GenericRender } from "./Renderer";

type RendererTypesToPatchPayloads<T> = {
  [K in keyof T]?: T[K] extends RendererController<infer P>
    ? Patch<P>[]
    : never;
};

type RendererTypesToPayloads<T> = {
  [K in keyof T]?: T[K] extends RendererController<infer R> ? R : never;
};

type RendererTypesToControllers<T> = {
  [K in keyof T]: T[K] extends GenericRender<infer R>
    ? RendererController<R>
    : never;
};

export class RenderDispatcher<
  TRendererTypes extends { [key: string]: GenericRender<any> },
  TRendererControllers = RendererTypesToControllers<TRendererTypes>,
  TRendererPayloads = RendererTypesToPayloads<TRendererControllers>,
  TRendererPatchPayloads = RendererTypesToPatchPayloads<TRendererControllers>
> {
  isReady = false;
  resizeObserveUnsubscribe: Unsubscribe;

  constructor(
    hostElement: HTMLElement,
    private renderers: TRendererControllers,
    private onReadyToRender: () => void
  ) {
    this.resizeObserveUnsubscribe = observeElementBoundingRect(
      hostElement,
      rectangle => this.resize(rectangle)
    );
  }

  setViewport(viewport: Viewport) {
    this.getRenders().forEach(r => r.setViewport(viewport));
  }

  render(renderPayload: TRendererPayloads) {
    Object.entries(this.renderers).forEach(([name, value]) => {
      const payload = (renderPayload as any)[name];
      if (payload) value.renderer.render(payload);
    });
  }

  renderPatches(renderPayloadPatches: TRendererPatchPayloads) {
    Object.entries(this.renderers).forEach(([name, value]) => {
      const patches = (renderPayloadPatches as any)[name];
      if (patches) value.renderer.renderPatches(patches);
    });
  }

  async pickObjects(options: PickingOptions): Promise<PickingResult[]> {
    const result = await Promise.all(
      this.getRenders().map(r => r.pickObjects(options))
    );
    return result.flat();
  }

  dispose() {
    this.resizeObserveUnsubscribe();
    this.getRenders().forEach(r => r.dispose());
  }

  private getRenders() {
    return Object.values(this.renderers).map(v => v.renderer);
  }

  private resize(size: Size) {
    this.getRenders().forEach(r => r.setSize(size));

    //first resize
    if (!this.isReady) {
      this.isReady = true;
      this.onReadyToRender();
    }
  }
}
