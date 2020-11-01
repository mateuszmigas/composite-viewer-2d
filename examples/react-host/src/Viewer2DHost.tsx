import React from "react";
import { generateRandomRobots } from "./generators";
import { createCanvasChild, createDivChild } from "./helpers/dom";
import { Canvas2DRenderer } from "./renderers/canvas2DRenderer";
import { HtmlRenderer } from "./renderers/htmlRenderer";
import { PixijsRendererRenderer } from "./renderers/pixijsRenderer";
import { ThreeJsRendererer } from "./renderers/threejsRenderer";
import {
  RenderDispatcher,
  Viewport,
  ViewportManipulator,
  RendererControllerFactory,
  RenderingStatsMonitorPanel,
} from "./viewer2d";

const createCanvasWorker = (name: string) =>
  new Worker("./renderers/renderWorker.template.ts", {
    type: "module",
    name: `${name}.renderer`,
  });

type SuperViewerRenderers = {
  threejs: ThreeJsRendererer;
  pixijs: PixijsRendererRenderer;
  canvas2d: Canvas2DRenderer;
  html: HtmlRenderer;
};

export class Viewer2DHost extends React.PureComponent<{}, {}> {
  hostElement: React.RefObject<HTMLDivElement>;
  renderDispatcher!: RenderDispatcher<SuperViewerRenderers>;
  viewportManipulator!: ViewportManipulator;

  constructor(props: {}) {
    super(props);
    this.hostElement = React.createRef();
    this.state = {};
  }

  componentDidMount() {
    if (this.hostElement.current === null) return;

    //disable context menu
    this.hostElement.current.oncontextmenu = () => false;

    const initialViewport = {
      position: { x: 0, y: 0 },
      zoom: 1,
    };

    this.viewportManipulator = new ViewportManipulator(
      this.hostElement.current,
      initialViewport,
      (newViewport: Viewport) => this.renderDispatcher.setViewport(newViewport)
    );

    const monitorPanel = new RenderingStatsMonitorPanel();
    this.hostElement.current.appendChild(monitorPanel.getElement());

    const factory = new RendererControllerFactory(
      {
        schedulerType: "onDemandSynchronized",
        profiling: {
          onRendererStatsUpdated: monitorPanel.updateStats,
        },
      },
      createCanvasWorker
    );

    const rendererControllers = {
      pixijs: factory.create(
        PixijsRendererRenderer,
        [createDivChild(this.hostElement.current, 203)],
        true
      ),
      html: factory.create(
        HtmlRenderer,
        [createDivChild(this.hostElement.current, 204)],
        true
      ),
      canvas2d: factory.createOffscreenIfAvailable(
        Canvas2DRenderer,
        [createCanvasChild(this.hostElement.current, 202)],
        true
      ),
      threejs: factory.createOrchestratedOffscreenIfAvailable(
        ThreeJsRendererer,
        [],
        index =>
          createCanvasChild(this.hostElement.current as any, 100 + index),
        {
          balancedFields: ["rectangles"],
          frameTimeTresholds: {
            tooSlowIfMoreThan: 16,
            tooFastIfLessThan: 5,
          },
          initialExecutors: 2,
          minExecutors: 1,
          maxExecutors: 4,
          frequency: 4000,
        },
        true
      ),
    };
    monitorPanel.addRenderers(rendererControllers);

    this.renderDispatcher = new RenderDispatcher<SuperViewerRenderers>(
      this.hostElement.current,
      rendererControllers,
      this.fullRender
    );

    this.renderDispatcher.setViewport(initialViewport);
  }

  private fullRender = () => {
    const { rectangles, ellipses, texts } = generateRandomRobots(50);
    this.renderDispatcher.render({
      canvas2d: {
        borders: rectangles,
      },
      threejs: {
        rectangles,
      },
      pixijs: {
        ellipses,
      },
      html: {
        texts,
      },
    });
  };

  componentWillUnmount() {
    this.renderDispatcher.dispose();
  }

  render() {
    return (
      <div
        className="viewer-content"
        onClick={() => {
          const { rectangles, ellipses, texts } = generateRandomRobots(10);
          this.renderDispatcher.renderPatches({
            canvas2d: [{ path: "borders", op: "add", values: rectangles }],
            threejs: [{ path: "rectangles", op: "add", values: rectangles }],
            pixijs: [{ path: "ellipses", op: "add", values: ellipses }],
            html: [{ path: "texts", op: "add", values: texts }],
          });
        }}
        tabIndex={0}
        ref={this.hostElement}
      ></div>
    );
  }
}
