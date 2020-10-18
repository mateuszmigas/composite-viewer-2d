import { GenericRender, Renderer } from "../renderers";
type Parameter<T extends (args: any) => any> = T extends (args: infer P) => any
  ? P
  : never;

type foo = (name: string) => any;
type CCCC = Parameter<foo>;

export type RendererController<TPayload> = {
  id: string;
  renderer: Renderer;
  payloadSelector: (payload: TPayload) => any;
  enabled: boolean;
};

export type RendrerMap<T> = {
  name: string;
  renderer: Renderer;
  enabled?: boolean;
  payloadSelector: (payload: T) => any;
};
