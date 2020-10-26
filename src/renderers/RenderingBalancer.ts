import { ArrayFieldsOnly } from "../types/common";

export type AdjustPayloadPolicy = "mergeExtremes" | "spreadEvenly";

export type RenderBalancerOptions<TRendererPayload> = {
  minExecutors?: number;
  maxExecutors?: number;
  frequency?: number;
  adjustPayloadPolicy?: AdjustPayloadPolicy;
  balancedFields: (keyof ArrayFieldsOnly<TRendererPayload>)[];
};

export class RenderBalancer {
  constructor(private adjustPayloadPolicy: AdjustPayloadPolicy) {}

  onSSie() {}

  onTooFast() {}
}
