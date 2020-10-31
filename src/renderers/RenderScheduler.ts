import { RenderMode } from "./../types/common";
import { RenderingPerformanceMonitor } from "./RenderingPerformanceMonitor";

export type RenderScheduler = (renderCallback: (time: number) => void) => void;

export const createOnDemandRAFRenderScheduler = (): RenderScheduler => (
  renderCallback: (time: number) => void
) => requestAnimationFrame(renderCallback);

export const createContinuousRenderScheduler = (): RenderScheduler => {
  let callback: (time: number) => void;

  function renderLoop(time: number) {
    callback?.(time);
    requestAnimationFrame(renderLoop);
  }

  requestAnimationFrame(renderLoop);

  return (renderCallback: (time: number) => void) =>
    (callback = renderCallback);
};

export const enhanceWithProfiler = (
  scheduler: RenderScheduler,
  performanceMonitor: RenderingPerformanceMonitor
): RenderScheduler => (renderCallback: (time: number) => void) =>
  scheduler((time: number) => {
    performanceMonitor?.start();
    renderCallback(time);
    performanceMonitor?.end();
  });

export const createRenderSchedulerForMode = (renderMode: RenderMode) =>
  renderMode === "continuous"
    ? createContinuousRenderScheduler()
    : createOnDemandRAFRenderScheduler();
