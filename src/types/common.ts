import { Size } from "./geometry";
import { Viewport } from "./viewport";

export type RenderMode = "onDemand" | "continuous";

export type Renderer = {
  render(time: number, renderPayload: any): void;
  onResize(size: Size): void;
  onViewportChanged(viewport: Viewport): void;
  setVisibility(visible: boolean): void;
  dispose(): void;
  needsRender: boolean;
};

export type Unsubscribe = () => void;
