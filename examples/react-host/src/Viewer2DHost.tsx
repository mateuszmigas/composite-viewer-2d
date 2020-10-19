import React from "react";
import {
  Canvas2DSimpleRenderer,
  Color,
  RenderDispatcher,
  RenderRectangleObject,
  Viewport,
  ViewportManipulator,
  createCanvasElement,
  RendererCollection,
  Unsubscribe,
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

const createCanvasWorker = (name: string) =>
  new Worker("./renderWorker.template.ts", {
    type: "module",
    name: name,
  });

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

    const rendererCollection = new RendererCollection<MyRenderPayload>(
      {
        renderMode: "onDemand",
        profiling: {
          onRendererStatsUpdated: (rendererId, renderingStats) =>
            console.log(
              `renderer: ${rendererId}, stats: ${JSON.stringify(
                renderingStats
              )}`
            ),
        },
      },
      createCanvasWorker
    );
    rendererCollection.addRenderer(
      "cycki1",
      Canvas2DSimpleRenderer,
      [this.createCanvas(101)],
      (payload: MyRenderPayload) => ({
        rectangles: payload.someRectangles1,
      }),
      true
    );
    rendererCollection.addOffscreenRenderer(
      "cycki2",
      Canvas2DSimpleRenderer,
      [this.createCanvas(102)],
      (payload: MyRenderPayload) => ({
        rectangles: payload.someRectangles2,
      }),
      true
    );

    //for debug only
    //displayControllerPanel

    this.renderDispatcher = new RenderDispatcher(
      this.hostElement.current,
      rendererCollection.getRenderers(),
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
      // someRectangles1: generateRandomRectangles(100),
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
  };

  componentWillUnmount() {
    this.renderDispatcher.dispose();
  }

  render() {
    return (
      <div
        className="viewer-content"
        onClick={() => {
          console.log("clicked");
          this.renderDispatcher
            .pickObjects({
              mode: "position",
              position: { x: 100, y: 100 },
            })
            .then(result => console.log(result))
            .catch(error => console.error(error));
        }}
        tabIndex={0}
        ref={this.hostElement}
      ></div>
    );
  }
}
