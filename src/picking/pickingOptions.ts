import { Position2D, Rectangle } from "../types/geometry";

export type PickingOptions =
  | {
      mode: "position";
      position: Position2D;
    }
  | {
      mode: "area";
      rectangle: Rectangle;
    };
