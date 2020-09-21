import React from "react";
import { Color, Viewport } from "../../../lib/types/geometry";
import {
  Canvas2DSimpleRenderer,
  RenderDispatcher,
  RenderRectangleObject,
} from "./viewer2d";

interface Viewer2DHostProps {}

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

export const Viewer2DHost = (props: Viewer2DHostProps) => {
  const hostElement = React.useRef<HTMLDivElement>(null);
  const renderDispatcher = React.useRef<RenderDispatcher<MyRenderPayload>>();
  const [viewport] = React.useState<Viewport>({
    position: { x: 0, y: 0 },
    zoom: 1,
  });

  React.useEffect(() => {
    if (hostElement.current === null) return;

    renderDispatcher.current = new RenderDispatcher(
      hostElement.current,
      {
        renderMode: "onDemand",
      },
      [
        {
          name: "Canvas 2D",
          renderer: new Canvas2DSimpleRenderer(hostElement.current),
          payloadSelector: (payload: MyRenderPayload) => ({
            rectangles: payload.someRectangles,
          }),
          enabled: true,
        },
      ]
    );
    renderDispatcher.current.setViewport(viewport);
    renderDispatcher.current.render({
      someRectangles: [
        {
          type: "Rectangle",
          containerId: "1",
          x: 0,
          y: 0,
          width: 50,
          height: 80,
          color: randomColor(),
        },
      ],
    });

    return () => {
      renderDispatcher.current?.dispose();
    };
  }, []);

  return <div className="viewer-content" tabIndex={0} ref={hostElement}></div>;
};
