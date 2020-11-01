import { PickingOptions, PickingResult } from "../picking";
import { Size, Unsubscribe } from "../utils/commonTypes";
import { RendererController } from "./rendererController";
import { Viewport } from "../manipulation/viewport";
import { observeElementBoundingRect } from "../utils/dom";
import { Patch } from "../patching/patch";
import { Renderer } from "./renderer";

type GetPayloadType<T> = {
  [K in keyof T]?: T[K] extends RendererController<infer R> ? R : never;
};

type GetPayloadPatchType<T> = {
  [K in keyof T]?: T[K] extends RendererController<infer P>
    ? Patch<P>[]
    : never;
};

type GetControllersType<T> = {
  [K in keyof T]: T[K] extends Renderer<infer R>
    ? RendererController<R>
    : never;
};

export type RenderPayloadPatches<
  T extends { [key: string]: Renderer<any> }
> = GetPayloadPatchType<GetControllersType<T>>;

export class RenderDispatcher<
  TRendererTypes extends { [key: string]: Renderer<any> },
  TRendererControllers = GetControllersType<TRendererTypes>,
  TRendererPayloads = GetPayloadType<TRendererControllers>,
  TRendererPatchPayloads = GetPayloadPatchType<TRendererControllers>
> {
  isReady = false;
  resizeObserveUnsubscribe: Unsubscribe;

  constructor(
    hostElement: HTMLElement,
    private rendererControllers: TRendererControllers,
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

  render(payload: TRendererPayloads) {
    Object.entries(this.rendererControllers).forEach(([key, value]) => {
      const controllerPayload = (payload as any)[key];
      if (controllerPayload) value.renderer.render(controllerPayload);
    });
  }

  renderPatches(payloadPatches: TRendererPatchPayloads) {
    Object.entries(this.rendererControllers).forEach(([key, value]) => {
      const controllerPayloadPatches = (payloadPatches as any)[key];
      if (controllerPayloadPatches)
        value.renderer.renderPatches(controllerPayloadPatches);
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
    return Object.values(this.rendererControllers).map(rc => rc.renderer);
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
