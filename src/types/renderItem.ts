import { Color } from "./geometry";

export type RenderBaseObject = {
  containerId: string;
  layerId?: string;
  static?: boolean;
  type: string;
};

export type RenderRectangleObject = RenderBaseObject & {
  type: "Rectangle";
  containerId: string;
  layerId?: string;
  static?: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  color: Color;
};

export type RenderCircleObject = RenderBaseObject & {
  type: "Circle";
  containerId: string;
  layerId?: string;
  static?: boolean;
  x: number;
  y: number;
  radius: number;
  color: Color;
};
