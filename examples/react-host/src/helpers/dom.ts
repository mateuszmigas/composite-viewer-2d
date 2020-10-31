export const createCanvasChild = (
  hostElement: HTMLElement,
  zIndex: number
): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  canvas.style.zIndex = zIndex.toString();
  canvas.style.position = "absolute"; //important for zIndex to work
  hostElement.appendChild(canvas);
  return canvas;
};

export const createDivChild = (
  hostElement: HTMLElement,
  zIndex: number
): HTMLDivElement => {
  const div = document.createElement("div");
  div.style.zIndex = zIndex.toString();
  div.style.position = "absolute"; //important for zIndex to work
  hostElement.appendChild(div);
  return div;
};
