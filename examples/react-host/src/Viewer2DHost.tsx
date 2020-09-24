import React from "react";
import {
  Canvas2DSimpleRenderer,
  Color,
  RenderDispatcher,
  RenderRectangleObject,
  Viewport,
  ViewportManipulator,
} from "./viewer2d";

const createWorker = (name: string) =>
  new Worker("./my.worker", {
    type: "module",
    name: name, //todo pattern
  });

const w = createWorker("worker 2");
w.postMessage("dupa");
w.onmessage = e => {
  console.log("message back");
};

//const worker = createCalculationWorker();
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
        workerFactory: createWorker,
      },
      [
        {
          name: "Canvas 2D 1aa",
          renderer: new Canvas2DSimpleRenderer(this.hostElement.current, 100),
          payloadSelector: (payload: MyRenderPayload) => ({
            rectangles: payload.someRectangles1,
          }),
          runAsWorker: true,
          enabled: true,
        },
        {
          name: "Canvas 2D 2",
          renderer: new Canvas2DSimpleRenderer(this.hostElement.current, 101),
          payloadSelector: (payload: MyRenderPayload) => ({
            rectangles: payload.someRectangles2,
          }),
          enabled: false,
        },
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
          containerId: "2",
          x: 200,
          y: 30,
          width: 50,
          height: 80,
          color: randomColor(),
        },
      ],
    });
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
