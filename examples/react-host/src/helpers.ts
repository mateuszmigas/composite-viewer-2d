import { EllipseShape, RectangleShape, TextShape } from "./renderers/shapes";
import { Color } from "./viewer2d";

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

export const randomRectangle = (): RectangleShape => {
  return {
    x: randomInteger(0, 2000),
    y: randomInteger(0, 2000),
    width: randomInteger(100, 200),
    height: randomInteger(100, 200),
    color: randomColor(),
  };
};

export const generateRobot = (index: number) => {
  const x = randomInteger(0, 2000);
  const y = randomInteger(0, 2000);
  const unit = randomInteger(10, 50);
  const color = randomColor();

  const head: RectangleShape = {
    x: x + 3 * unit,
    y: y + 0,
    width: 4 * unit,
    height: 3 * unit,
    color: color,
  };

  const torso: RectangleShape = {
    x: x + 2 * unit,
    y: y + 3 * unit,
    width: 6 * unit,
    height: 4 * unit,
    color: color,
  };

  const leftLeg: RectangleShape = {
    x: x + 3 * unit,
    y: y + 7 * unit,
    width: unit,
    height: 3 * unit,
    color: color,
  };

  const rightLeg: RectangleShape = {
    x: x + 6 * unit,
    y: y + 7 * unit,
    width: unit,
    height: 3 * unit,
    color: color,
  };

  const leftEye: EllipseShape = {
    x: x + 4 * unit,
    y: y + unit,
    width: unit / 2,
    height: unit / 2,
    color: { r: 0, g: 0, b: 0 },
  };

  const leftEyeMiddle: EllipseShape = {
    x: x + 4 * unit,
    y: y + unit,
    width: unit / 4,
    height: unit / 4,
    color: { r: 255, g: 255, b: 255 },
  };

  const rightEye: EllipseShape = {
    x: x + 6 * unit,
    y: y + unit,
    width: unit / 2,
    height: unit / 2,
    color: { r: 0, g: 0, b: 0 },
  };

  const rightEyeMiddle: EllipseShape = {
    x: x + 6 * unit,
    y: y + unit,
    width: unit / 4,
    height: unit / 4,
    color: { r: 255, g: 255, b: 255 },
  };

  const mouth: EllipseShape = {
    x: x + 5 * unit,
    y: y + 2 * unit,
    width: unit,
    height: unit / 4,
    color: { r: 0, g: 0, b: 0 },
  };

  const mouthMiddle: EllipseShape = {
    x: x + 5 * unit,
    y: y + 2 * unit,
    width: unit * 0.6,
    height: unit / 6,
    color: { r: 100, g: 0, b: 0 },
  };

  return {
    rectangles: [head, torso, leftLeg, rightLeg],
    ellipses: [
      leftEye,
      leftEyeMiddle,
      rightEye,
      rightEyeMiddle,
      mouth,
      mouthMiddle,
    ],
    texts: [
      {
        x:
          x +
          (index < 10 ? 3.75 * unit : index < 100 ? 3.5 * unit : 3.25 * unit),
        y: y + 4 * unit,
        width: unit,
        height: unit / 4,
        color: { r: 0, g: 0, b: 0 },
        text: `R:${index}`,
        fontSize: unit,
      },
    ],
  };
};

export const generateRandomRectangles = (
  count: number = 100
): RectangleShape[] => {
  return repeat(count).map(() => randomRectangle());
};

export const generateRandomRobots = (count: number = 100) => {
  return repeat(count).reduce(
    (accumulator, current, index) => {
      const r = generateRobot(index);
      accumulator.rectangles.push(...r.rectangles);
      accumulator.ellipses.push(...r.ellipses);
      accumulator.texts.push(...r.texts);
      return accumulator;
    },
    {
      rectangles: [] as RectangleShape[],
      ellipses: [] as EllipseShape[],
      texts: [] as TextShape[],
    }
  );
};
