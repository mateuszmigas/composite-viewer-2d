import { RenderingStats } from "../renderers/RenderingPerformanceMonitor";
import { RendererController } from "../renderers/RendererController";
import { Observable } from "../common/observable";

export class PerformanceMonitorPanel {
  hostElement: HTMLDivElement;
  contentElement: HTMLDivElement;
  statsObservable = new Observable<{
    rendererId: string;
    renderingStats: RenderingStats;
  }>(null);
  renderersToKeepAlive: { id: string; lastUpdate: number }[] = [];
  isEnabled = true;

  constructor() {
    this.hostElement = createMainPanel();
    this.contentElement = document.createElement("div");
    this.contentElement.style.display = "table";
    const headerButton = createHeaderButton();
    headerButton.onclick = () => {
      this.isEnabled = !this.isEnabled;

      headerButton.textContent = this.isEnabled ? "PM: hide" : "PM: show";

      this.contentElement.style.visibility = this.isEnabled
        ? "visible"
        : "collapse";
    };
    this.hostElement.appendChild(headerButton);
    this.hostElement.appendChild(this.contentElement);
  }

  getElement(): HTMLDivElement {
    return this.hostElement;
  }

  updateStats = (rendererId: string, renderingStats: RenderingStats) => {
    if (this.isEnabled) {
      const now = Date.now();
      const item = this.renderersToKeepAlive.find(
        item => item.id === rendererId
      );
      if (item) {
        item.lastUpdate = now;
      } else {
        this.renderersToKeepAlive.push({
          id: rendererId,
          lastUpdate: now,
        });
      }

      this.clearDeadRenderers(now);

      this.statsObservable.setValue({ rendererId, renderingStats });
    }
  };

  addRenderers(controllers: RendererController<any>[]) {
    createPanel(controllers, this.statsObservable).forEach(p =>
      this.contentElement.appendChild(p)
    );
  }

  private clearDeadRenderers(now: number) {}
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

const createMainPanel = () => {
  const mainPanel = document.createElement("div");
  mainPanel.style.color = "white";
  mainPanel.style.background = "black";
  mainPanel.style.width = "fit-content";
  mainPanel.style.opacity = "0.75";
  mainPanel.style.zIndex = "1000";
  mainPanel.style.height = "fit-content";
  mainPanel.style.position = "absolute";
  return mainPanel;
};

const createHeaderButton = () => {
  const headerButton = document.createElement("button");
  headerButton.style.width = "100%";
  headerButton.style.height = "25px";
  headerButton.textContent = "PM: hide";
  return headerButton;
};

const createPanel = (
  renderers: RendererController<any>[],
  stats: Observable<{
    rendererId: string;
    renderingStats: RenderingStats;
  }>
) =>
  renderers.map(renderer => {
    const divMain = document.createElement("div");
    divMain.style.margin = "10px";

    const idLabel = document.createElement("label");
    idLabel.textContent = `${renderer.id} - ${renderer.executionEnvironment}`;
    divMain.appendChild(idLabel);

    const divFrames = document.createElement("div");
    divFrames.style.display = "flex";
    divFrames.style.justifyContent = "space-between";
    divFrames.appendChild(createMaxFrameLabel(stats, renderer));
    divFrames.appendChild(createAvgFrameLabel(stats, renderer));
    divFrames.appendChild(createEnableCheckbox(renderer));
    divMain.appendChild(divFrames);

    divMain.appendChild(createTimelineCanvas(stats, renderer));

    return divMain;
  });

const createEnableCheckbox = (renderer: RendererController<any>) => {
  const enableCheckbox = document.createElement("input");
  enableCheckbox.type = "checkbox";
  enableCheckbox.id = renderer.id;
  enableCheckbox.checked = !!renderer.enabled;
  enableCheckbox.onchange = () => {
    renderer.enabled = enableCheckbox.checked;
    renderer.renderer.setVisibility(renderer.enabled);
  };
  return enableCheckbox;
};

const createAvgFrameLabel = (
  stats: Observable<{ rendererId: string; renderingStats: RenderingStats }>,
  renderer: RendererController<any>
) => {
  const avgFrameLabel = document.createElement("label");
  avgFrameLabel.textContent = "Avg: ?ms";
  avgFrameLabel.style.marginRight = "5px";
  stats.attach(x => {
    if (x.rendererId === renderer.id) {
      avgFrameLabel.textContent = `Avg: ${x.renderingStats.averageFrameTime.toFixed(
        2
      )}ms`;

      avgFrameLabel.style.color = getFrameColor(
        x.renderingStats.averageFrameTime
      );
    }
  });
  return avgFrameLabel;
};

const createMaxFrameLabel = (
  stats: Observable<{ rendererId: string; renderingStats: RenderingStats }>,
  r: RendererController<any>
) => {
  const maxFrameLabel = document.createElement("label");
  maxFrameLabel.textContent = "Max: ?ms";
  maxFrameLabel.style.marginRight = "5px";
  stats.attach(x => {
    if (x.rendererId === r.id) {
      maxFrameLabel.textContent = `Max: ${x.renderingStats.maxFrameTime.toFixed(
        2
      )}ms`;

      maxFrameLabel.style.color = getFrameColor(x.renderingStats.maxFrameTime);
    }
  });
  return maxFrameLabel;
};

const createTimelineCanvas = (
  stats: Observable<{ rendererId: string; renderingStats: RenderingStats }>,
  renderer: RendererController<any>
) => {
  const canvas = document.createElement("canvas");
  const width = 240;
  const height = 40;
  const singleFrameWidth = 4;
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  const backgroundColor = "blue";

  if (context) {
    context.fillStyle = backgroundColor;
    context.fillRect(0, 0, width, height);
  }

  stats.attach(x => {
    if (x.rendererId === renderer.id) {
      if (context === null) return;
      const frameTime = x.renderingStats.averageFrameTime;
      context.drawImage(
        canvas,
        0,
        0,
        width - singleFrameWidth,
        height,
        singleFrameWidth,
        0,
        width - singleFrameWidth,
        height
      );

      context.fillStyle = backgroundColor;
      context.fillRect(0, 0, singleFrameWidth, height);
      context.fillStyle = getFrameColor(frameTime);
      context.fillRect(
        0,
        height - 2 * frameTime,
        singleFrameWidth,
        2 * frameTime
      );
    }
  });

  return canvas;
};
