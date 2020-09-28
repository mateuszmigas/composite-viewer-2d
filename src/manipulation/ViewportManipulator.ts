import { ZeroPosition } from "./../types/geometry";
import { Position2D } from "../types/geometry";
import {
  EventHandler,
  EventType,
  ThrottleHtmlManipulator,
} from "./ThrottleHtmlManipulator";
import { Viewport, zoomAtPosition } from "../types/viewport";
import { createReducer } from "../common/state";

type Action =
  | {
      type: "translate";
      offsetX: number;
      offsetY: number;
    }
  | { type: "zoomInAtPosition"; position: Position2D }
  | { type: "zoomOutAtPosition"; position: Position2D };

const reducer = (action: Action, viewport: Viewport): Viewport => {
  switch (action.type) {
    case "translate": {
      return {
        ...viewport,
        position: {
          x: viewport.position.x + action.offsetX,
          y: viewport.position.y + action.offsetY,
        },
      };
    }
    case "zoomInAtPosition": {
      return zoomAtPosition(viewport, 1.1, action.position);
    }
    case "zoomOutAtPosition": {
      return zoomAtPosition(viewport, 0.9, action.position);
    }
    default:
      return viewport;
  }
};

type CustomHandler<T extends Event> = {
  type: EventType;
  handler: EventHandler<T>;
};

export class ViewportManipulator extends ThrottleHtmlManipulator {
  private pointerPosition = ZeroPosition();
  private isMoving = false;
  private actionReducer: (actions: Action[]) => Viewport;

  constructor(
    protected element: HTMLElement,
    viewportProvider: Viewport | (() => Viewport),
    private onViewportChange: (newViewport: Viewport) => void,
    customization?: {
      reducer: <TAction extends Action>(
        action: TAction,
        viewport: Viewport
      ) => Viewport;
      eventHandlers: CustomHandler<Event>[];
    }
  ) {
    super(element);

    this.actionReducer = createReducer(viewportProvider, reducer);
    this.registerEvent("mousedown", this.onMouseDown);
    this.registerEvent("mousemove", this.onMouseMove);
    this.registerEvent("mouseup", this.onMouseUp);
    this.registerEvent("mouseleave", this.onMouseLeave);
    this.registerEvent("wheel", this.onWheel);
  }

  private dispatchActions = (actions: Action[]) => {
    const newViewport = this.actionReducer(actions);
    this.onViewportChange(newViewport);
  };

  private onMouseDown = (e: MouseEvent) => {
    if (e.button === 2) {
      this.pointerPosition = { x: e.offsetX, y: e.offsetY };
      this.isMoving = true;
    }
  };

  private onMouseMove = (e: MouseEvent) => {
    if (this.isMoving) {
      this.dispatchActions([
        {
          type: "translate",
          offsetX: e.offsetX - this.pointerPosition.x,
          offsetY: e.offsetY - this.pointerPosition.y,
        },
      ]);
    }

    this.pointerPosition = { x: e.offsetX, y: e.offsetY };
  };

  private onMouseUp = () => {
    this.isMoving = false;
  };

  private onMouseLeave = () => {
    this.isMoving = false;
  };

  private onWheel = (e: WheelEvent) => {
    const action = e.deltaY < 0 ? "zoomInAtPosition" : "zoomOutAtPosition";

    this.dispatchActions([
      {
        type: action,
        position: {
          x: e.offsetX,
          y: e.offsetY,
        },
      },
    ]);
  };
}
