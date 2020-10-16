export interface IRenderScheduler {
  //  register(renderCallback: () => void): void;
  scheduleRender(renderCallback: () => void): void;
}

export class RAFRenderScheduler implements IRenderScheduler {
  scheduleRender(renderCallback: () => void) {
    requestAnimationFrame(renderCallback);
  }
}
export class RAFRenderScheduler2 implements IRenderScheduler {
  scheduleRender(renderCallback: () => void) {
    requestAnimationFrame(renderCallback);
  }
}

export class ImmediateRenderScheduler implements IRenderScheduler {
  scheduleRender(renderCallback: () => void): void {
    renderCallback();
  }
}
