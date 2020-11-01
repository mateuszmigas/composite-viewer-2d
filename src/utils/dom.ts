import { Rectangle, Unsubscribe } from "../utils/commonTypes";

const domRectToRectangle = (rect: DOMRect) =>
  ({
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
  } as Rectangle);

export const observeElementBoundingRect = (
  element: Element,
  callback: (rectangle: Rectangle) => void
): Unsubscribe => {
  const resizeObserver = new ResizeObserver(elements => {
    const observerEntry = elements.find(e => e.target === element);

    if (observerEntry)
      callback(
        domRectToRectangle(observerEntry.target.getBoundingClientRect())
      );
  });

  resizeObserver.observe(element);
  return () => resizeObserver.disconnect();
};

export const isOffscreenCanvasSupported = () =>
  !!HTMLCanvasElement.prototype.transferControlToOffscreen;
