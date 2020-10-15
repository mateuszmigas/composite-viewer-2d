import { PickingOptions, PickingResult } from "../picking";
import { Size, Viewport } from "../types";

export type Renderer = {
  render(renderPayload: unknown): void;
  setSize(size: Size): void;
  setViewport(viewport: Viewport): void;
  setVisibility(visible: boolean): void;
  pickObjects(options: PickingOptions): Promise<PickingResult[]>;
  dispose(): void;
};
