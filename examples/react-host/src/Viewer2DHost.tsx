import React from "react";
import { generateRandomRectangles } from "./helpers";
import {
  Canvas2DSimpleRenderer,
  Color,
  RenderDispatcher,
  Viewport,
  ViewportManipulator,
  createCanvasElement,
  RendererControllerFactory,
  PerformanceMonitorPanel,
  Patchers,
} from "./viewer2d";

interface Viewer2DHostProps {}
interface Viewer2DHostState {}

export const randomInteger = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1) + min);

const createCanvasWorker = (name: string) =>
  new Worker("./renderWorker.template.ts", {
    type: "module",
    name: `${name}.Renderer2D`,
  });

type SuperViewerRenderers = {
  canvas2d2: Canvas2DSimpleRenderer;
  canvas2dOffscreen: Canvas2DSimpleRenderer;
  canvas2dOrchestrator: Canvas2DSimpleRenderer;
};

type SuperViewerPatches = Patchers<SuperViewerRenderers>;

export class Viewer2DHost extends React.PureComponent<
  Viewer2DHostProps,
  Viewer2DHostState
> {
  hostElement: React.RefObject<HTMLDivElement>;
  renderDispatcher!: RenderDispatcher<SuperViewerRenderers>;
  viewportManipulator!: ViewportManipulator;

  constructor(props: Viewer2DHostProps) {
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
      (newViewport: Viewport) => {
        this.renderDispatcher.setViewport(newViewport);
        //this.fullRender();
      }
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

    const aaaa = factory.createOffscreenIfAvailable(
      Canvas2DSimpleRenderer,
      [this.createCanvas(200)],
      true
    );
    const rendererControllers = {
      canvas2d2: factory.create(
        Canvas2DSimpleRenderer,
        [this.createCanvas(101)],
        true
      ),
      canvas2dOffscreen: factory.createOffscreenIfAvailable(
        Canvas2DSimpleRenderer,
        [this.createCanvas(200)],
        true
      ),
      canvas2dOrchestrator: factory.createOrchestratedOffscreenIfAvailable(
        Canvas2DSimpleRenderer,
        [],
        index => this.createCanvas(200 + index),
        {
          balancedFields: ["rectangles"],
          // frameTimeTresholds: {
          //   tooSlow: 16,
          //   tooFast: 5
          // },
          //initialExecutors:
          minExecutors: 1,
          maxExecutors: 4,
          frequency: 4000,
        },
        true
      ),
    };
    perfMonitorPanel.addRenderers(rendererControllers);

    this.renderDispatcher = new RenderDispatcher<SuperViewerRenderers>(
      this.hostElement.current,
      rendererControllers,
      this.fullRender
    );

    this.renderDispatcher.setViewport(initialViewport);
  }

  private createCanvas(zIndex: number) {
    if (this.hostElement.current === null) throw new Error("fs");
    return createCanvasElement(this.hostElement.current, zIndex);
  }

  private fullRender = () => {
    this.renderDispatcher.render({
      canvas2d2: {
        rectangles: generateRandomRectangles(1),
        circles: [],
        layers: "Esf",
        executionTime: 12,
        // cycki: () => "fe",
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

            this.renderDispatcher.renderPatches({
              canvas2dOffscreen: [
                {
                  path: "layers",
                  value: "2",
                },
              ],
              canvas2dOrchestrator: [
                {
                  path: "layers",
                  value: "2",
                },
              ],
            });
          }}
          tabIndex={0}
          ref={this.hostElement}
        ></div>
      </div>
    );
  }
}
