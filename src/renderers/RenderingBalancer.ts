export type AdjustPayloadPolicy = "mergeExtremes" | "spreadEvenly";

export type RenderBalancerOptions = {
  minExecutors?: number;
  maxExecutors?: number;
  frequency?: number;
  adjustPayloadPolicy?: AdjustPayloadPolicy;
};

export class RenderBalancer {
  constructor(private adjustPayloadPolicy: AdjustPayloadPolicy) {}

  onSSie() {}

  onTooFast() {}
}
