export interface IRenderScheduler {
  register(renderCallback: () => void): void;
  scheduleRender(): void;
}

export class RAFRenderScheduler implements IRenderScheduler {
  renderCallback: (() => void) | undefined;

  register(renderCallback: () => void) {
    this.renderCallback = renderCallback;
  }

  scheduleRender() {
    if (this.renderCallback) {
      requestAnimationFrame(this.renderCallback);
    }
  }
}

export class ImmediateRenderScheduler implements IRenderScheduler {
  renderCallback: (() => void) | undefined;

  register(renderCallback: () => void) {
    this.renderCallback = renderCallback;
  }

  scheduleRender(): void {
    this.renderCallback?.();
  }
}
