export interface IRenderScheduler {
  //  register(renderCallback: () => void): void;
  scheduleRender(renderCallback: () => void): void;
}

export class RAFRenderScheduler implements IRenderScheduler {
  scheduleRender(renderCallback: () => void) {
    requestAnimationFrame(renderCallback);
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
