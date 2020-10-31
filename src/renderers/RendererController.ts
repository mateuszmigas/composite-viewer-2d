import { Renderer } from "./Renderer";
import { RendererExecutionEnvironment } from "./RendererExecutionEnvironment";

export type RendererController<TPayload> = {
  readonly id: string;
  readonly renderer: Renderer<TPayload>;
  readonly executionEnvironment: RendererExecutionEnvironment;
  enabled: boolean;
};
