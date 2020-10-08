import { Size } from "./geometry";
import { Viewport } from "./viewport";

export type RenderMode = "onDemand" | "continuous";

export type Renderer = {
  render(time: number, renderPayload: any): void;
  setSize(size: Size): void;
  setViewport(viewport: Viewport): void;
  setVisibility(visible: boolean): void;
  dispose(): void;
};

export type Unsubscribe = () => void;
