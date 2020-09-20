import { Rectangle } from "../types/geometry";

export const domRectToRectangle = (rect: DOMRect) =>
  ({
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
  } as Rectangle);
