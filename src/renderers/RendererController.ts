import { Renderer } from "./Renderer";
import { RendererExecutionEnvironment } from "./RendererExecutionEnvironment";

export type RendererController<TPayload> = {
  readonly id: string;
  readonly renderer: Renderer;
  readonly executionEnvironment: RendererExecutionEnvironment;
  payloadSelector: (payload: TPayload) => unknown;
  enabled: boolean;
};
