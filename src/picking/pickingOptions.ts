import { Position, Rectangle } from "../utils/commonTypes";

export type PickingOptions =
  | {
      mode: "position";
      position: Position;
    }
  | {
      mode: "area";
      rectangle: Rectangle;
    };
