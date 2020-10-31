import React from "react";
import { generateRandomRectangles } from "./helpers";
import { createCanvasChild, createDivChild } from "./helpers/dom";
import { PixijsRendererRenderer } from "./renderers/PixijsRenderer";
import { ThreeJsRendererer } from "./renderers/ThreejsRenderer";
import {
  Canvas2DSimpleRenderer,
  RenderDispatcher,
  Viewport,
  ViewportManipulator,
  RendererControllerFactory,
  PerformanceMonitorPanel,
  Patchers,
} from "./viewer2d";

const createCanvasWorker = (name: string) =>
  new Worker("./renderers/renderWorker.template.ts", {
    type: "module",
    name: `${name}.Renderer2D`,
  });

type SuperViewerRenderers = {
  threejs: ThreeJsRendererer;
  pixijs: PixijsRendererRenderer;
  canvas2d2: Canvas2DSimpleRenderer;
  // canvas2dOffscreen: Canvas2DSimpleRenderer;
  // canvas2dOrchestrator: Canvas2DSimpleRenderer;
};

//type SuperViewerPatches = Patchers<SuperViewerRenderers>;

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

    //debug opnly
    const perfMonitorPanel = new PerformanceMonitorPanel();
    this.hostElement.current.appendChild(perfMonitorPanel.getElement());

    const factory = new RendererControllerFactory(
      {
        renderMode: "onDemand",
        profiling: {
          onRendererStatsUpdated: perfMonitorPanel.updateStats,
        },
      },
      createCanvasWorker
    );

    const rendererControllers = {
      canvas2d2: factory.create(
        Canvas2DSimpleRenderer,
        [createCanvasChild(this.hostElement.current, 101)],
        true
      ),
      pixijs: factory.create(
        PixijsRendererRenderer,
        [createDivChild(this.hostElement.current, 102)],
        true
      ),
      threejs: factory.createOffscreenIfAvailable(
        ThreeJsRendererer,
        [createCanvasChild(this.hostElement.current, 103)],
        true
      ),
      // threejs: factory.createOrchestratedOffscreenIfAvailable(
      //   ThreeJsRendererer,
      //   [],
      //   index => this.createCanvas(200 + index),
      //   {
      //     balancedFields: ["rectangles"],
      //     // frameTimeTresholds: {
      //     //   tooSlow: 16,
      //     //   tooFast: 5
      //     // },
      //     //initialExecutors:
      //     minExecutors: 1,
      //     maxExecutors: 4,
      //     frequency: 4000,
      //   },
      //   true
      // ),
    };
    perfMonitorPanel.addRenderers(rendererControllers);

    this.renderDispatcher = new RenderDispatcher<SuperViewerRenderers>(
      this.hostElement.current,
      rendererControllers,
      this.fullRender
    );

    this.renderDispatcher.setViewport(initialViewport);
  }

  private fullRender = () => {
    const rectangles = generateRandomRectangles(10);
    this.renderDispatcher.render({
      canvas2d2: {
        rectangles: rectangles,
        circles: [],
        layers: "Esf",
        executionTime: 12,
        // cycki: () => "fe",
      },
      threejs: {
        rectangles: rectangles,
      },
      // canvas2dOffscreen: {
      //   rectangles: generateRandomRectangles(1),
      //   circles: [],
      //   layers: "Esf",
      //   executionTime: 12,
      // },
      // canvas2dOrchestrator: {
      //   rectangles: generateRandomRectangles(10),
      //   circles: [],
      //   layers: "Esf",
      //   executionTime: 12,
      // },
    });

    // this.renderDispatcher.renderPatches({
    //   canvas2d2: [
    //     { path: "rectangles", op: "add", values: generateRandomRectangles(20) },
    //   ],
    // });
  };

  componentWillUnmount() {
    this.renderDispatcher.dispose();
  }

  render() {
    return (
      <div className="viewer-content">
        <div
          className="viewer-content"
          // onClick={() => {
          //   console.log("clicked");
          //   this.renderDispatcher
          //     .pickObjects({
          //       mode: "position",
          //       position: { x: 100, y: 100 },
          //     })
          //     .then(result => console.log(result))
          //     .catch(error => console.error(error));
          // }}
          onClick={() => {
            console.log("clicked");

            // const newRectangles = generateRandomRectangles(0);
            // this.renderDispatcher.renderPatches({
            //   canvas2d2: [
            //     {
            //       path: "rectangles",
            //       op: "add",
            //       values: [],
            //     },
            //   ],
            //   threejs: [
            //     {
            //       path: "rectangles",
            //       op: "add",
            //       values: newRectangles,
            //     },
            //   ],
            // });
          }}
          tabIndex={0}
          ref={this.hostElement}
        ></div>
      </div>
    );
  }
}
