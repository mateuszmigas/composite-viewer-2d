export type RendererExecutionEnvironment = Readonly<
  | { type: "mainThread" }
  | { type: "webWorker" }
  | { type: "orchestratedWebWorkers"; maxWorkers: number }
>;
