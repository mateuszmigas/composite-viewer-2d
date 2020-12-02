import * as ArrayUtils from "../utils/array";
import { ArrayFieldsOnly } from "../utils/typeMapping";

export type BalancerField<T> = keyof ArrayFieldsOnly<T>;

export type BalancerStats = {
  framesCount: number;
  totalRenderTime: number;
  maxFrameTime: number;
};

export type BalancerOptions<TRendererPayload> = {
  minExecutors: number;
  maxExecutors: number;
  balancedFields: BalancerField<TRendererPayload>[];
  frameTimeTresholds: {
    tooSlowIfMoreThan: number;
    tooFastIfLessThan: number;
  };
};

export type BalancerResult<TRendererPayload> =
  | {
      needsBalancing: false;
    }
  | {
      needsBalancing: true;
      payloadSelectors: ((payload: TRendererPayload) => unknown)[];
    };

export const createPayloadsSplitIntoChunks = <TRendererPyload>(
  length: number,
  fields: BalancerField<TRendererPyload>[]
) =>
  ArrayUtils.createIndexArray(length).map(index => (payload: TRendererPyload) =>
    fields.reduce(
      (result, key) => {
        const value = result[key];

        if (Array.isArray(value))
          Object.assign(result, {
            [key]: ArrayUtils.chunk(value, index, length),
          });

        return result;
      },
      { ...payload }
    )
  );

export const defaultBalancer = <TRendererPyload>(
  stats: BalancerStats[],
  options: BalancerOptions<TRendererPyload>
): BalancerResult<TRendererPyload> => {
  const averageFps =
    stats.reduce((sum, r) => sum + r.totalRenderTime / r.framesCount, 0) /
    stats.length;

  if (averageFps < options.frameTimeTresholds.tooFastIfLessThan) {
    const newLength = stats.length - 1;
    return newLength < options.minExecutors
      ? { needsBalancing: false }
      : {
          needsBalancing: true,
          payloadSelectors: createPayloadsSplitIntoChunks(
            newLength,
            options.balancedFields
          ),
        };
  }

  if (averageFps > options.frameTimeTresholds.tooSlowIfMoreThan) {
    const newLength = stats.length + 1;
    return newLength > options.maxExecutors
      ? { needsBalancing: false }
      : {
          needsBalancing: true,
          payloadSelectors: createPayloadsSplitIntoChunks(
            newLength,
            options.balancedFields
          ),
        };
  }

  return {
    needsBalancing: false,
  };
};
