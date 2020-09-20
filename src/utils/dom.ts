import { Unsubscribe } from "../types/common";
import { Rectangle } from "../types/geometry";
import { domRectToRectangle } from "./converters";

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

export const createCanvasElement = (
  hostElement: HTMLElement,
  zIndex: number
): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  canvas.style.zIndex = zIndex.toString();
  canvas.style.position = "absolute"; //important for zIndex to work
  hostElement.appendChild(canvas);
  return canvas;
};
