export * from "./renderers";
export * from "./types";
export * from "./manipulation";

export const createCalculationWorker = () =>
  new Worker("./super.worker", {
    type: "module",
    name: "CalculationWorker",
  });
