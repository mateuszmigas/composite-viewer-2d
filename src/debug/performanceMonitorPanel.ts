import { createIndexArray } from "./../common/arrayExtensions";
import { RenderingStats } from "../renderers/RenderingPerformanceMonitor";
import { RendererController } from "../renderers/RendererController";
import { Observable } from "../common/observable";

type RendererStats = {
  rendererId: string;
  renderingStats: RenderingStats[];
};

export class PerformanceMonitorPanel {
  hostElement: HTMLDivElement;
  contentElement: HTMLDivElement;
  statsObservable = new Observable<RendererStats>(null);
  observedRendererControllers: {
    rendererController: RendererController<any>;
    element: HTMLDivElement;
  }[] = [];
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

  updateStats = (
    rendererId: string,
    renderingStats: RenderingStats | RenderingStats[]
  ) => {
    if (this.isEnabled) {
      this.statsObservable.setValue({
        rendererId,
        renderingStats: Array.isArray(renderingStats)
          ? renderingStats
          : [renderingStats],
      });
    }
  };

  addRenderers(rendererControllers: RendererController<any>[]) {
    rendererControllers.forEach(rendererController => {
      const element = createRendererPanel(
        rendererController,
        this.statsObservable
      );
      this.observedRendererControllers.push({
        rendererController,
        element,
      });
      this.contentElement.appendChild(element);
    });
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

const createRendererPanel = (
  rendererController: RendererController<any>,
  stats: Observable<RendererStats>
) => {
  const divMain = document.createElement("div");
  divMain.style.padding = "5px";
  divMain.style.border = "1px solid";

  const divHeader = document.createElement("div");
  divHeader.style.display = "flex";
  divHeader.style.justifyContent = "space-between";
  const idLabel = document.createElement("label");
  idLabel.textContent = `${rendererController.id} - ${rendererController.executionEnvironment.type}`;
  divHeader.appendChild(idLabel);
  divHeader.appendChild(createEnableCheckbox(rendererController));
  divMain.appendChild(divHeader);

  const addStats = (index: number) => {
    const divOffline = document.createElement("div");
    divOffline.textContent = "Offline";
    divOffline.style.color = "red";
    divOffline.style.visibility = "collapse";

    const divFrames = document.createElement("div");
    divFrames.style.display = "flex";
    divFrames.style.position = "absolute";
    divFrames.style.justifyContent = "space-between";
    divFrames.appendChild(
      createMaxFrameLabel(stats, rendererController, index)
    );
    divFrames.appendChild(
      createAvgFrameLabel(stats, rendererController, index)
    );

    stats.attach(x => {
      if (x.rendererId === rendererController.id) {
        if (x.renderingStats.length < index + 1) {
          divOffline.style.visibility = "visible";
          divFrames.style.visibility = "collapse";
        } else {
          divOffline.style.visibility = "collapse";
          divFrames.style.visibility = "visible";
        }
      }
    });

    divMain.appendChild(divFrames);
    divMain.appendChild(divOffline);
    divMain.appendChild(createTimelineCanvas(stats, rendererController, index));
  };

  if (
    rendererController.executionEnvironment.type === "orchestratedWebWorkers"
  ) {
    createIndexArray(
      rendererController.executionEnvironment.maxWorkers
    ).forEach(addStats);
  } else {
    addStats(0);
  }

  return divMain;
};

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
  stats: Observable<RendererStats>,
  rendererController: RendererController<any>,
  index: number
) => {
  const avgFrameLabel = document.createElement("label");
  avgFrameLabel.textContent = "Avg: ?ms";
  avgFrameLabel.style.marginRight = "5px";
  stats.attach(x => {
    if (x.rendererId === rendererController.id && x.renderingStats[index]) {
      avgFrameLabel.textContent = `Avg: ${x.renderingStats[
        index
      ].averageFrameTime.toFixed(2)}ms`;

      avgFrameLabel.style.color = getFrameColor(
        x.renderingStats[index].averageFrameTime
      );
    }
  });
  return avgFrameLabel;
};

const createMaxFrameLabel = (
  stats: Observable<RendererStats>,
  rendererController: RendererController<any>,
  index: number
) => {
  const maxFrameLabel = document.createElement("label");
  maxFrameLabel.textContent = "Max: ?ms";
  maxFrameLabel.style.marginRight = "5px";
  stats.attach(x => {
    if (x.rendererId === rendererController.id && x.renderingStats[index]) {
      maxFrameLabel.textContent = `Max: ${x.renderingStats[
        index
      ].maxFrameTime.toFixed(2)}ms`;

      maxFrameLabel.style.color = getFrameColor(
        x.renderingStats[index].maxFrameTime
      );
    }
  });
  return maxFrameLabel;
};

const createTimelineCanvas = (
  stats: Observable<RendererStats>,
  rendererController: RendererController<any>,
  index: number
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
    if (x.rendererId === rendererController.id && x.renderingStats[index]) {
      if (context === null) return;
      const frameTime = x.renderingStats[index].averageFrameTime;
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
