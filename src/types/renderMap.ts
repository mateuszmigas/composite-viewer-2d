import { Renderer } from "../renderers";

export type RendrerMap<T> = {
  name: string;
  renderer: Renderer;
  enabled?: boolean;
  payloadSelector: (payload: T) => any;
  synchronizeGroup?: number;
};
