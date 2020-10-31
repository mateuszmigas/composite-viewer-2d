import { timeStamp } from "console";
import React from "react";
import { GenericRender } from "../../../lib";
import { Patch } from "../../../lib/types/patch";
import { generateRandomRectangles } from "./helpers";
import {
  Canvas2DSimpleRenderer,
  Color,
  RenderDispatcher,
  RenderRectangleObject,
  Viewport,
  ViewportManipulator,
  createCanvasElement,
  RendererControllerFactory,
  PerformanceMonitorPanel,
  RendererController,
} from "./viewer2d";

interface Viewer2DHostProps {}
interface Viewer2DHostState {}

export const randomInteger = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1) + min);
const randomColor = (): Color => {
  return {
    r: randomInteger(0, 255),
    g: randomInteger(0, 255),
    b: randomInteger(0, 255),
  };
};

const createCanvasWorker = (name: string) =>
  new Worker("./renderWorker.template.ts", {
    type: "module",
    name: `${name}.Renderer2D`,
  });

type RenderersTypes = {
  canvas2d2: Canvas2DSimpleRenderer;
  canvas2dOffscreen: Canvas2DSimpleRenderer;
};

export class Viewer2DHost extends React.PureComponent<
  Viewer2DHostProps,
  Viewer2DHostState
> {
  hostElement: React.RefObject<HTMLDivElement>;
  renderDispatcher!: RenderDispatcher<RenderersTypes>;
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

    // factory.create(
    //   "Canvas_2D_1",
    //   Canvas2DSimpleRenderer,
    //   [this.createCanvas(101)],
    //   payload => ({
    //     rectangles: payload.someRectangles1,
    //     //executionTime
    //   }),
    //   true
    // ),
    // factory.createOrchestratedOffscreenIfAvailable(
    //   "Canvas_2D_3",
    //   Canvas2DSimpleRenderer,
    //   [],
    //   index => this.createCanvas(200 + index),
    //   payload => ({
    //     rectangles: payload.someRectangles2,
    //   }),
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
    // mapping:
    //     payloadProps:
    // {
    //   prop: "aaa", value: { esfesf},
    //   prop: "fsfs", payload: "fsef"
    // }
    // payload =>
    // renderPatch =>
    // canvas2d: factory.createOffscreenIfAvailable(
    //   "Canvas_2D_2",
    //   Canvas2DSimpleRenderer,
    //   [this.createCanvas(200)],
    //   payload => ({
    //     rectangles: payload.someRectangles2,
    //     executionTime: payload.executionTime,
    //   }),
    //   true
    // ),

    const rendererControllers = {
      canvas2d2: factory.create(
        "Canvas_2D_1",
        Canvas2DSimpleRenderer,
        [this.createCanvas(101)],
        true
      ),
      canvas2dOffscreen: factory.createOffscreenIfAvailable(
        "Canvas_2D_2",
        Canvas2DSimpleRenderer,
        [this.createCanvas(200)],
        true
      ),
    };
    //perfMonitorPanel.addRenderers(rendererControllers);

    this.renderDispatcher = new RenderDispatcher(
      this.hostElement.current,
      rendererControllers,
      this.fullRender
    );

    this.renderDispatcher.setViewport(initialViewport);
  }

  // private addItem = () => {
  //   this.renderDispatcher.renderPatches([
  //     {
  //       path: "someRectangles1",
  //       op: "add",
  //       values: generateRandomRectangles(1),
  //     },
  //   ]);
  // };

  private createCanvas(zIndex: number) {
    if (this.hostElement.current === null) throw new Error("fs");
    return createCanvasElement(this.hostElement.current, zIndex);
  }

  private fullRender = () => {
    const newLocal = generateRandomRectangles(100);
    const newLocal_1 = Date.now();

    this.renderDispatcher.render({
      canvas2d2: {
        rectangles: generateRandomRectangles(1),
        circles: [],
        layers: "Esf",
        executionTime: 12,
      },
      canvas2dOffscreen: {
        rectangles: generateRandomRectangles(1),
        circles: [],
        layers: "Esf",
        executionTime: 12,
      },
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
              canvas2d2: [
                {
                  path: "rectangles",
                  op: "add",
                  values: generateRandomRectangles(5),
                },
              ],
            });
          }}
          tabIndex={0}
          ref={this.hostElement}
        >
          <button
            onClick={() => {
              console.log("clicked");

              this.renderDispatcher.renderPatches({
                canvas2d2: [
                  {
                    path: "rectangles",
                    op: "add",
                    values: generateRandomRectangles(5),
                  },
                ],
              });
            }}
          >
            Cyc
          </button>
        </div>
      </div>
    );
  }
}
