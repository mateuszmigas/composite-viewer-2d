export type Position2D = {
  x: number;
  y: number;
};

export type Position3D = {
  x: number;
  y: number;
  z: number;
};

export type Color = {
  r: number;
  g: number;
  b: number;
};

export type Size = {
  width: number;
  height: number;
};

export type Size3D = {
  width: number;
  height: number;
  length: number;
};

export type Viewport = {
  position: Position2D;
  zoom: number;
};

export type Rectangle = Position2D & Size;
