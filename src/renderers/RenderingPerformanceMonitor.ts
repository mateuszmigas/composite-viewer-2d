export type RenderingStats = {
  maxFrameTime: number;
  averageFrameTime: number;
};

export class RenderingPerformanceMonitor {
  beginTime = 0;
  frames = 0;
  totalRenderTime = 0;
  maxFrameTime = 0;

  constructor(public onStatsReady: (stats: RenderingStats) => void) {}

  start() {
    this.beginTime = Date.now();
  }

  end() {
    const timeElapsed = Date.now() - this.beginTime;
    this.totalRenderTime += timeElapsed;
    this.maxFrameTime = Math.max(this.maxFrameTime, timeElapsed);
    this.frames++;

    if (this.frames > 100) {
      const stats = {
        maxFrameTime: this.maxFrameTime,
        averageFrameTime: this.totalRenderTime / this.frames,
      };

      this.onStatsReady?.(stats);
      this.frames = 0;
      this.totalRenderTime = 0;
      this.maxFrameTime = 0;
    }
  }
}
