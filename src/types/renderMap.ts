import { Renderer } from "../renderers";
import { RenderPayload } from "./renderItem";

export type RendrerMap<T> = {
  name: string;
  renderer: Renderer;
  enabled?: boolean;
  payloadSelector: (payload: T) => RenderPayload;
  synchronizeGroup?: number;
};
