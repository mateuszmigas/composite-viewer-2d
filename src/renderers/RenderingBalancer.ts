import { ArrayFieldsOnly } from "../utils/typeMapping";

export type BalancerField<T> = keyof ArrayFieldsOnly<T>;

export type RenderBalancerOptions<TRendererPayload> = {
  minExecutors?: number;
  maxExecutors?: number;
  frequency?: number;
  balancedFields: BalancerField<TRendererPayload>[];
};
