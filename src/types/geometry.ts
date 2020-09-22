export type Position2D = {
  x: number;
  y: number;
};

export const ZeroPosition = (): Position2D => ({ x: 0, y: 0 });

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

export type Rectangle = Position2D & Size;
