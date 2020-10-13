import React from "react";
import { generateRandomRectangles, repeat } from "./helpers";
import {
  Canvas2DSimpleRenderer,
  Color,
  RenderDispatcher,
  RenderRectangleObject,
  Viewport,
  ViewportManipulator,
  createCanvasElement,
  WebWorkerRendererProxy,
  RAFSyncContext,
} from "./viewer2d";

interface Viewer2DHostProps {}
interface Viewer2DHostState {}

type MyRenderPayload = {
  someRectangles: RenderRectangleObject[];
};

const createCanvasWorker = (name: string) =>
  new Worker("./someworker.ts", {
    type: "module",
    name: name,
  });

// const w = createCanvasWorker();
// w.postMessage("cyci");
// w.onmessage = e => console.log("message back");
const totalItems = 20000;
const renderersIsWebWorker = [true, true];

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

    const defs = repeat(renderersIsWebWorker.length).map((_, index) => {
      const pageSize = totalItems / renderersIsWebWorker.length;
      return {
        name: `Canvas 2D ${index} ${
          renderersIsWebWorker[index] ? "WebWorker" : "MainThread"
        }`,
        renderer: renderersIsWebWorker[index]
          ? new WebWorkerRendererProxy(
              Canvas2DSimpleRenderer,
              this.createCanvas(101 + index),
              () => createCanvasWorker(`renderWorker${index + 1}`)
            )
          : new Canvas2DSimpleRenderer(this.createCanvas(101 + index)),
        payloadSelector: (payload: MyRenderPayload) => ({
          rectangles: payload.someRectangles.slice(
            index * pageSize,
            (index + 1) * pageSize
          ),
        }),
        enabled: true,
      };
    });
    this.renderDispatcher = new RenderDispatcher(
      this.hostElement.current,
      {
        renderMode: "onDemand",
      },
      defs
    );
    this.renderDispatcher.setViewport(initialViewport);
    this.renderDispatcher.render({
      someRectangles: generateRandomRectangles(totalItems),
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
