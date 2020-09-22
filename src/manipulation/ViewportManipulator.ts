import { ZeroPosition } from "./../types/geometry";
import { Position2D } from "../types/geometry";
import { ThrottleHtmlManipulator } from "./ThrottleHtmlManipulator";
import { Viewport, zoomAtPosition } from "../types/viewport";

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

export class ViewportManipulator extends ThrottleHtmlManipulator {
  private pointerPosition = ZeroPosition();
  private isMoving = false;

  constructor(
    protected element: HTMLElement,
    private getViewport: () => Viewport,
    private onViewportChange: (newViewport: Viewport) => void
  ) {
    super(element);
    this.registerEvent("mousedown", this.onMouseDown);
    this.registerEvent("mousemove", this.onMouseMove);
    this.registerEvent("mouseup", this.onMouseUp);
    this.registerEvent("mouseleave", this.onMouseLeave);
    this.registerEvent("wheel", this.onWheel);
    this.registerEvent("keydown", this.onKeyPress);
    this.element.oncontextmenu = this.onContextMenu;
  }

  private dispatchActions = (actions: Action[]) => {
    const newViewport = actions.reduce(
      (viewport, action) => reducer(action, viewport),
      this.getViewport()
    );

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

  //todo global?
  private onKeyPress = (e: KeyboardEvent) => {
    if (e.keyCode === 70) {
      //F
      //navigateToSceneSelectedProducts(this.sceneId);
    }
  };

  private onContextMenu = (e: MouseEvent) => {
    return false;
  };
}
