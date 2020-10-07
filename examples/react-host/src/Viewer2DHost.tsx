import React from "react";
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
  someRectangles: RenderRectangleObject[];
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
  new Worker("./someworker.ts", {
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
        // {
        //   name: "Canvas 2D",
        //   renderer: new Canvas2DSimpleRenderer(
        //     createCanvasElement(this.hostElement.current, 100)
        //   ),
        //   payloadSelector: (payload: MyRenderPayload) => ({
        //     rectangles: payload.someRectangles,
        //   }),
        //   enabled: true,
        // },
        {
          name: "Canvas 2D offscreen",
          renderer: new WebWorkerRendererProxy(
            Canvas2DSimpleRenderer,
            createCanvasElement(this.hostElement.current, 101),
            () => createCanvasWorker("someworker2")
          ),
          payloadSelector: (payload: MyRenderPayload) => ({
            rectangles: payload.someRectangles,
          }),
          enabled: true,
        },
      ]
    );
    this.renderDispatcher.setViewport(initialViewport);
    this.renderDispatcher.render({
      someRectangles: [
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
    });
  }

  // componentDidUpdate(prevProps: SceneProps) {
  //   if (prevProps.viewport != this.props.viewport) {
  //     this.renderDispatcher.setViewport(this.props.viewport);
  //   }
  //   if (
  //     prevProps.products != this.props.products ||
  //     prevProps.selectedProductsIds != this.props.selectedProductsIds
  //   ) {
  //     console.time("compare");
  //     const path = getPatch(prevProps.products, this.props.products);
  //     console.timeEnd("compare");
  //     console.log("path", path);

  //     const arr1 = [...prevProps.products.values()];
  //     const arr2 = [...this.props.products.values()];
  //     console.time("comparearr");
  //     compareArrs(arr1, arr2);
  //     console.timeEnd("comparearr");
  //     //render patch
  //     this.renderScene();
  //   }
  // }

  componentWillUnmount() {
    this.renderDispatcher.dispose();
  }

  render() {
    return (
      <div className="viewer-content" tabIndex={0} ref={this.hostElement}></div>
    );
  }
}
