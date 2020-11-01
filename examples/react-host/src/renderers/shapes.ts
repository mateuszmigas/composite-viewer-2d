import { Color } from "../viewer2d";

export type RectangleShape = {
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
