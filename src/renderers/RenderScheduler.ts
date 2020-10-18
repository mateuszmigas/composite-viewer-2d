import { IRenderingPerformanceMonitor } from "./RenderingPerformanceMonitor";

export type RenderScheduler = (renderCallback: () => void) => void;

export const createOnDemandRAFRenderScheduler = (
  performanceMonitor?: IRenderingPerformanceMonitor
): RenderScheduler => {
  if (performanceMonitor) {
    return (renderCallback: () => void) => {
      requestAnimationFrame(() => {
        performanceMonitor.start();
        renderCallback();
        performanceMonitor.end();
      });
    };
  } else {
    return (renderCallback: () => void) =>
      requestAnimationFrame(renderCallback);
  }
};

export const createContinuousRenderScheduler = (
  performanceMonitor?: IRenderingPerformanceMonitor
): RenderScheduler => {
  let callback: () => void;

  function renderLoop(time: number) {
    performanceMonitor?.start();
    callback();
    performanceMonitor?.end();
    requestAnimationFrame(renderLoop);
  }

  requestAnimationFrame(renderLoop);

  return (renderCallback: () => void) => (callback = renderCallback);
};

export const createOnDemandImmediateRenderScheduler = (): RenderScheduler => (
  renderCallback: () => void
) => renderCallback();
