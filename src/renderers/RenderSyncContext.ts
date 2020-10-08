export interface IRenderSyncContext {
  register(renderCallback: () => void): void;
  scheduleRender(): void;
}

export class RAFSyncContext implements IRenderSyncContext {
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

export class InstantRenderSyncContext implements IRenderSyncContext {
  renderCallback: (() => void) | undefined;

  register(renderCallback: () => void) {
    this.renderCallback = renderCallback;
  }

  scheduleRender(): void {
    this.renderCallback?.();
  }
}
