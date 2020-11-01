export type RenderingStats = {
  maxFrameTime: number;
  averageFrameTime: number;
};

export class RenderingStatsMonitor {
  beginTime = 0;
  frames = 0;
  totalRenderTime = 0;
  maxFrameTime = 0;

  constructor(
    private onStatsReady: (stats: RenderingStats) => void,
    private options: { updateStatsOnFrameCount?: number }
  ) {}

  start() {
    this.beginTime = Date.now();
  }

  end() {
    const timeElapsed = Date.now() - this.beginTime;
    this.totalRenderTime += timeElapsed;
    this.maxFrameTime = Math.max(this.maxFrameTime, timeElapsed);
    this.frames++;

    const frameCount = this.options.updateStatsOnFrameCount || 60;
    if (this.frames > frameCount) {
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
