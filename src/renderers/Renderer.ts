import { Patch } from "./../types/patch";
import { PickingOptions, PickingResult } from "../picking";
import { Size, Viewport } from "../types";

export interface Renderer<T> {
  render(renderPayload: T): void;
  renderPatches(renderPayloadPatches: Patch<T>[]): void;
  setSize(size: Size): void;
  setViewport(viewport: Viewport): void;
  setVisibility(visible: boolean): void;
  pickObjects(options: PickingOptions): Promise<PickingResult[]>;
  dispose(): void;
}
