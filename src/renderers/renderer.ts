import { Viewport } from "../manipulation/viewport";
import { Patch } from "../patching/patch";
import { PickingOptions, PickingResult } from "../picking";
import { Size } from "../utils/commonTypes";

export interface Renderer<T> {
  render(payload: T): void;
  renderPatches(payloadPatches: Patch<T>[]): void;
  setSize(size: Size): void;
  setViewport(viewport: Viewport): void;
  setVisibility(visible: boolean): void;
  pickObjects(options: PickingOptions): Promise<PickingResult[]>;
  dispose(): void;
}
