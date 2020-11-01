import { RenderingStats } from "../monitoring/renderingStatsMonitor";
import { RenderSchedulerType } from "./renderScheduler";

export type RendererOptions = {
  schedulerType: RenderSchedulerType;
  profiling?: {
    onRendererStatsUpdated: (renderingStats: RenderingStats[]) => void;
    updateStatsOnFrameCount?: number;
  };
};
