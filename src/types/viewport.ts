import { Position2D } from "./geometry";

export type Viewport = {
  position: Position2D;
  zoom: number;
};

export const zoomAtPosition = (
  currentViewport: Viewport,
  zoom: number,
  position: Position2D
): Viewport => ({
  position: {
    x: position.x - (position.x - currentViewport.position.x) * zoom,
    y: position.y - (position.y - currentViewport.position.y) * zoom,
  },
  zoom: currentViewport.zoom * zoom,
});
