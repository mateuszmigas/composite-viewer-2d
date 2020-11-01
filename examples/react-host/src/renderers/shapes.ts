import { Color } from "../viewer2d";

export type RectangleShape = {
  x: number;
  y: number;
  width: number;
  height: number;
  color: Color;
};

export type EllipseShape = {
  x: number;
  y: number;
  width: number;
  height: number;
  color: Color;
};

export type TextShape = {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fontSize: number;
};
