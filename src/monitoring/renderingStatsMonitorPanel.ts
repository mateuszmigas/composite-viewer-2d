import { RenderingStats } from "./renderingStatsMonitor";
import { RendererController } from "../renderers/rendererController";
import { Observable } from "../utils/observable";
import { createIndexArray } from "../utils/array";

type RendererStats = {
  rendererId: string;
  renderingStats: RenderingStats[];
};

export class RenderingStatsMonitorPanel {
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

  addRenderers(rendererControllers: {
    [key: string]: RendererController<any>;
  }) {
    Object.entries(rendererControllers).forEach(([key, rendererController]) => {
      const element = createRendererPanel(
        key,
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
  name: string,
  rendererController: RendererController<any>,
  stats: Observable<RendererStats>
) => {
  const divMain = document.createElement("div");
  divMain.style.padding = "5px";
  divMain.style.border = "1px solid";
  divMain.style.display = "flex";
  divMain.style.flexDirection = "column";
  divMain.style.width = "240px";

  const divHeader = document.createElement("div");
  divHeader.style.display = "flex";
  divHeader.style.justifyContent = "space-between";
  const idLabel = document.createElement("label");
  idLabel.textContent = `${name} - ${rendererController.executionEnvironment.type}`;
  divHeader.appendChild(idLabel);
  divHeader.appendChild(createEnableCheckbox(rendererController));
  divMain.appendChild(divHeader);

  const addStats = (index: number) => {
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

const createTimelineCanvas = (
  stats: Observable<RendererStats>,
  rendererController: RendererController<any>,
  index: number
) => {
  const canvas = document.createElement("canvas");
  canvas.style.border = "1px #9e9e9e7a solid";
  const width = 240;
  const height = 60;
  const statsHeight = 40;
  const fontSize = 15;
  const statsStart = height - statsHeight;
  const singleFrameWidth = 4;
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  const backgroundColor = "black";

  if (context) {
    context.fillStyle = backgroundColor;
    context.fillRect(0, 0, width, height);
  }

  stats.attach(x => {
    if (context === null || x.rendererId !== rendererController.id) return;

    if (x.renderingStats.length < index + 1) {
      context.fillStyle = backgroundColor;
      context.fillRect(0, 0, width, statsStart);
      context.fillStyle = "red";
      context.font = `${fontSize}px arial`;
      context.fillText(`Offline`, 0, fontSize);
    } else if (x.renderingStats[index]) {
      const frameTime = Math.min(x.renderingStats[index].averageFrameTime, 20);
      context.drawImage(
        canvas,
        0,
        statsStart,
        width - singleFrameWidth,
        height,
        singleFrameWidth,
        statsStart,
        width - singleFrameWidth,
        height
      );

      context.fillStyle = backgroundColor;
      context.fillRect(0, 0, width, statsStart);
      context.fillRect(0, statsStart, singleFrameWidth, statsHeight);
      context.fillStyle = getFrameColor(frameTime);
      context.fillRect(
        0,
        height - 2 * frameTime,
        singleFrameWidth,
        2 * frameTime
      );

      context.fillStyle = getFrameColor(x.renderingStats[index].maxFrameTime);
      context.font = `${fontSize}px arial`;
      context.fillText(
        `Max: ${x.renderingStats[index].maxFrameTime.toFixed(2)}ms`,
        0,
        fontSize
      );
      context.fillStyle = getFrameColor(
        x.renderingStats[index].averageFrameTime
      );
      context.fillText(
        `Avg: ${x.renderingStats[index].averageFrameTime.toFixed(2)}ms`,
        width / 2,
        fontSize
      );
    }
  });

  return canvas;
};
