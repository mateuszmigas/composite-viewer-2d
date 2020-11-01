import { RenderingStatsMonitor } from "../monitoring/renderingStatsMonitor";

export type RenderSchedulerType = "onDemandSynchronized" | "onDemand";
export type RenderScheduler = (renderCallback: (time: number) => void) => void;

export const createOnDemandRAFRenderScheduler = (): RenderScheduler => (
  renderCallback: (time: number) => void
) => requestAnimationFrame(renderCallback);

export const createOnDemandImmediateRenderScheduler = (): RenderScheduler => (
  renderCallback: (time: number) => void
) => renderCallback(0);

export const enhanceWithProfiler = (
  scheduler: RenderScheduler,
  performanceMonitor: RenderingStatsMonitor
): RenderScheduler => (renderCallback: (time: number) => void) =>
  scheduler((time: number) => {
    performanceMonitor?.start();
    renderCallback(time);
    performanceMonitor?.end();
  });

export const createRenderSchedulerByType = (
  renderSchedulerType: RenderSchedulerType
) =>
  renderSchedulerType === "onDemandSynchronized"
    ? createOnDemandRAFRenderScheduler()
    : createOnDemandImmediateRenderScheduler();
