import React from "react";
import { MyCustomRenderer } from "./MyCustomRenderer";
import { RAFRenderScheduler, tryCreateProxy } from "../../../lib";
import {
  Canvas2DSimpleRenderer,
  Color,
  RenderDispatcher,
  RenderRectangleObject,
  Viewport,
  ViewportManipulator,
  createCanvasElement,
  WebWorkerRendererProxy,
} from "./viewer2d";

interface Viewer2DHostProps {}
interface Viewer2DHostState {}

type MyRenderPayload = {
  someRectangles1: RenderRectangleObject[];
  someRectangles2: RenderRectangleObject[];
};

export const randomInteger = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1) + min);
const randomColor = (): Color => {
  return {
    r: randomInteger(0, 255),
    g: randomInteger(0, 255),
    b: randomInteger(0, 255),
  };
};

const foo = (item: number | (() => number)) => {};
foo(() => 2);
foo(2);

const createCanvasWorker = (name: string) =>
  new Worker("./renderWorker.template.ts", {
    type: "module",
    name: name,
  });

// const w = createCanvasWorker();
// w.postMessage("cyci");
// w.onmessage = e => console.log("message back");
export class Viewer2DHost extends React.PureComponent<
  Viewer2DHostProps,
  Viewer2DHostState
> {
  hostElement: React.RefObject<HTMLDivElement>;
  renderDispatcher!: RenderDispatcher<MyRenderPayload>;
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
      (newViewport: Viewport) => this.renderDispatcher.setViewport(newViewport)
    );

    this.renderDispatcher = new RenderDispatcher(
      this.hostElement.current,
      {
        renderMode: "onDemand",
      },
      [
        {
          name: "some canvas 1 ",
          // renderer: new MyCustomRenderer(
          //   new RAFRenderScheduler(),
          //   this.createCanvas(101)
          // ),
          renderer: tryCreateProxy(
            () => createCanvasWorker("someworker3"),
            MyCustomRenderer,
            [this.createCanvas(101)]
          ),
          payloadSelector: (payload: MyRenderPayload) => ({
            rectangles: payload.someRectangles2,
          }),
          enabled: true,
        },
        {
          name: "some canvas 2",
          // renderer: new Canvas2DSimpleRenderer(
          //   new RAFRenderScheduler(),
          //   this.createCanvas(102),
          //   "fesefs",
          //   12
          // ),
          renderer: tryCreateProxy(
            () => createCanvasWorker("someworker2"),
            Canvas2DSimpleRenderer,
            [this.createCanvas(102), "fsefs", 12]
          ),
          payloadSelector: (payload: MyRenderPayload) => ({
            rectangles: payload.someRectangles1,
          }),
          enabled: true,
        },
        // {
        //   name: "Canvas 2D offscreen",
        //   renderer: new WebWorkerRendererProxy(
        //     Canvas2DSimpleRenderer,
        //     this.createCanvas(101),
        //     () => createCanvasWorker("someworker2"),
        //     "fes",
        //     {
        //       age: 33,
        //     }
        //   ),
        //   //renderer: new Canvas2DSimpleRenderer(this.createCanvas(101)),
        //   payloadSelector: (payload: MyRenderPayload) => ({
        //     rectangles: payload.someRectangles2,
        //   }),
        //   async: false,
        //   enabled: true,
        //},
      ]
    );
    this.renderDispatcher.setViewport(initialViewport);
    this.renderDispatcher.render({
      someRectangles1: [
        {
          type: "Rectangle",
          containerId: "1",
          x: 100,
          y: 10,
          width: 50,
          height: 80,
          color: randomColor(),
        },
      ],
      someRectangles2: [
        {
          type: "Rectangle",
          containerId: "1",
          x: 110,
          y: 20,
          width: 50,
          height: 80,
          color: randomColor(),
        },
      ],
    });
  }

  private createCanvas(zIndex: number) {
    if (this.hostElement.current === null) throw new Error("fs");
    return createCanvasElement(this.hostElement.current, zIndex);
  }

  componentWillUnmount() {
    this.renderDispatcher.dispose();
  }

  render() {
    return (
      <div className="viewer-content" tabIndex={0} ref={this.hostElement}></div>
    );
  }
}
