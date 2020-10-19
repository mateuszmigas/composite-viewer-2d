import { IRenderingPerformanceMonitor } from "./RenderingPerformanceMonitor";

export type RenderScheduler = (renderCallback: () => void) => void;

export const createOnDemandRAFRenderScheduler = (): RenderScheduler => (
  renderCallback: () => void
) => requestAnimationFrame(renderCallback);

export const createContinuousRenderScheduler = (): RenderScheduler => {
  let callback: () => void;

  function renderLoop() {
    callback?.();
    requestAnimationFrame(renderLoop);
  }

  requestAnimationFrame(renderLoop);

  return (renderCallback: () => void) => (callback = renderCallback);
};

export const createOnDemandImmediateRenderScheduler = (): RenderScheduler => (
  renderCallback: () => void
) => renderCallback();

export const enhanceWithProfiler = (
  scheduler: RenderScheduler,
  performanceMonitor: IRenderingPerformanceMonitor
): RenderScheduler => (renderCallback: () => void) =>
  scheduler(() => {
    performanceMonitor?.start();
    renderCallback();
    performanceMonitor?.end();
  });
