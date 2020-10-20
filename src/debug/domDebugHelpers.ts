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

        if (x.renderingStats.maxFrameTime > 16) {
          maxFrame.style.color = "red";
        } else {
          maxFrame.style.color = "green";
        }
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

        if (x.renderingStats.averageFrameTime > 16) {
          avgFrame.style.color = "red";
        } else {
          avgFrame.style.color = "green";
        }
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

    div.appendChild(divMain);
  });

  return div;
};
