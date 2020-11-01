export type Position = {
  x: number;
  y: number;
};

export const ZeroPosition = (): Position => ({ x: 0, y: 0 });

export type Size = {
  width: number;
  height: number;
};

export type Rectangle = Position & Size;
export type Unsubscribe = () => void;
