import { GenericRender, Renderer } from "./Renderer";
import { RendererExecutionEnvironment } from "./RendererExecutionEnvironment";

export type RendererController<TPayload> = {
  readonly id: string;
  readonly renderer: GenericRender<TPayload>;
  readonly executionEnvironment: RendererExecutionEnvironment;
  enabled: boolean;
};
