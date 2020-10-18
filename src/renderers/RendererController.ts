import { Renderer } from "./Renderer";

export type RendererController<TPayload> = {
  id: string;
  renderer: Renderer;
  payloadSelector: (payload: TPayload) => unknown;
  enabled: boolean;
};
