import { Renderer } from "./common";
import { RenderPayload } from "./renderItem";

export type RendrerMap<T> = {
  name: string;
  renderer: Renderer;
  enabled: boolean;
  payloadSelector: (payload: T) => RenderPayload;
};
