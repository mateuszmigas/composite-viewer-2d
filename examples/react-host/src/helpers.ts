import { Color, RenderRectangleObject } from "./viewer2d";

export const repeat = (count: number) =>
  Array(count)
    .fill({})
    .map((_, index) => index);

export const randomInteger = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1) + min);

const randomColor = (): Color => {
  return {
    r: randomInteger(0, 255),
    g: randomInteger(0, 255),
    b: randomInteger(0, 255),
  };
};

export const randomRectangle = (): RenderRectangleObject => {
  return {
    type: "Rectangle",
    containerId: "1",
    x: randomInteger(0, 2000),
    y: randomInteger(0, 2000),
    width: randomInteger(100, 200),
    height: randomInteger(100, 200),
    color: randomColor(),
  };
};

export const generateRandomRectangles = (count: number = 100) => {
  return repeat(count).map(() => randomRectangle());
};
