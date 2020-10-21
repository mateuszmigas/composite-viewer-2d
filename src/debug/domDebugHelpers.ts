import { RenderingStats } from "./../renderers/RenderingPerformanceMonitor";
import { RendererController } from "../renderers/RendererController";

type Observer<T> = (value: T) => void;
class Observable<T> {
  observers: Observer<T>[] = [];
  constructor(private value: T | null) {}
  attach(observer: Observer<T>) {
    this.observers.push(observer);
    this.notify();
  }
  setValue(newValue: T) {
    this.value = newValue;
    this.notify();
  }
  private notify() {
    if (this.value !== null) {
      const value = this.value;
      this.observers.forEach(o => o(value));
    }
  }
}
export class PerformanceMonitorPanel {
  hostElement = document.createElement("div");
  statsObservable = new Observable<{
    rendererId: string;
    renderingStats: RenderingStats;
  }>(null);

  constructor() {}

  getElement(): HTMLDivElement {
    return this.hostElement;
  }

  updateStats = (rendererId: string, renderingStats: RenderingStats) => {
    this.statsObservable.setValue({ rendererId, renderingStats });
  };

  attachRendererControllers(controllers: RendererController<any>[]) {
    const panel = createPanel(controllers, this.statsObservable);
    this.hostElement.appendChild(panel);
  }
}

const getFrameColor = (duration: number) => {
  if (duration > 16) {
    return "red";
  } else if (duration > 10) {
    return "orange";
  } else {
    return "green";
  }
};

const createPanel = (
  renderers: RendererController<any>[],
  stats: Observable<{
    rendererId: string;
    renderingStats: RenderingStats;
  }>
): HTMLElement => {
  const div = document.createElement("div");
  div.style.color = "white";
  div.style.background = "black";
  div.style.width = "fit-content";
  div.style.opacity = "0.75";
  div.style.zIndex = "1000";
  div.style.height = "fit-content";
  div.style.position = "absolute";

  renderers.forEach(r => {
    const divMain = document.createElement("div");
    divMain.style.margin = "10px";

    const label = document.createElement("label");
    label.textContent = r.id;
    divMain.appendChild(label);

    const divFrames = document.createElement("div");
    divFrames.style.display = "flex";
    divFrames.style.justifyContent = "space-between";

    const maxFrame = document.createElement("label");
    maxFrame.textContent = "Max: ?ms";
    maxFrame.style.marginRight = "5px";
    stats.attach(x => {
      if (x.rendererId === r.id) {
        maxFrame.textContent = `Max: ${x.renderingStats.maxFrameTime.toFixed(
          2
        )}ms`;

        maxFrame.style.color = getFrameColor(x.renderingStats.maxFrameTime);
      }
    });
    divFrames.appendChild(maxFrame);
    const avgFrame = document.createElement("label");
    avgFrame.textContent = "Avg: ?ms";
    avgFrame.style.marginRight = "5px";
    stats.attach(x => {
      if (x.rendererId === r.id) {
        avgFrame.textContent = `Avg: ${x.renderingStats.averageFrameTime.toFixed(
          2
        )}ms`;

        avgFrame.style.color = getFrameColor(x.renderingStats.averageFrameTime);
      }
    });
    divFrames.appendChild(avgFrame);
    const input = document.createElement("input");
    input.type = "checkbox";
    input.id = r.id;
    input.checked = !!r.enabled;
    input.onchange = () => {
      r.enabled = input.checked;
      r.renderer.setVisibility(r.enabled);
    };
    divFrames.appendChild(input);
    divMain.appendChild(divFrames);

    const canvas = createCanvasPanel(stats, r);

    divMain.appendChild(canvas);

    div.appendChild(divMain);
  });

  return div;
};

function createCanvasPanel(
  stats: Observable<{ rendererId: string; renderingStats: RenderingStats }>,
  renderer: RendererController<any>
) {
  const width = 240;
  const height = 40;
  const oneFrameWidth = 4;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  const bg = "blue";
  if (ctx) {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);
  }

  stats.attach(x => {
    if (x.rendererId === renderer.id) {
      if (ctx === null) return;
      const f = x.renderingStats.averageFrameTime;
      ctx.drawImage(
        canvas,
        0,
        0,
        width - oneFrameWidth,
        height,
        oneFrameWidth,
        0,
        width - oneFrameWidth,
        height
      );

      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, oneFrameWidth, height);
      ctx.fillStyle = getFrameColor(f);
      ctx.fillRect(0, height - 2 * f, oneFrameWidth, 2 * f);
    }
  });
  return canvas;
}
