import { Renderer } from "./renderer";
import { RendererExecutionEnvironment } from "./rendererExecutionEnvironment";

export type RendererController<TPayload> = {
  readonly id: string;
  readonly renderer: Renderer<TPayload>;
  readonly executionEnvironment: RendererExecutionEnvironment;
  enabled: boolean;
};
