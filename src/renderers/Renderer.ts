import { PickingOptions, PickingResult } from "../picking";
import { Size, Viewport } from "../types";

export type PatchObject<T> = {
  added: { key: string; value: any }[];
  modified: { key: string; value: any }[];
  removed: string[];
};

export type PatchArray<T> = {
  added: T[];
  modified: T[];
  removed: T[];
};

//createPatch
//applyPatch

export type Patch<T> = {};

export type Renderer = {
  render(renderPayload: unknown): void;
  setSize(size: Size): void;
  setViewport(viewport: Viewport): void;
  setVisibility(visible: boolean): void;
  pickObjects(options: PickingOptions): Promise<PickingResult[]>;
  dispose(): void;
};

export interface GenericRender<T> extends Renderer {
  render(renderPayload: T): void;
  setSize(size: Size): void;
  setViewport(viewport: Viewport): void;
  setVisibility(visible: boolean): void;
  pickObjects(options: PickingOptions): Promise<PickingResult[]>;
  dispose(): void;
}
