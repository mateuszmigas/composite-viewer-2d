import { ValueOf } from "./../types/common";
import { PickingOptions, PickingResult } from "../picking";
import { Size, Viewport } from "../types";

export type PatchRecord<K, V> = {
  op: "add" | "remove" | "replace";
} & (V extends Array<infer U>
  ? {
      path: [K, number];
      value: U;
    }
  : {
      path: K;
      value: V;
    });

export type Patch<T> = PatchRecord<keyof T, ValueOf<T>>[];
type Payload = {
  name: {
    first: string;
    last: string;
  };
  ages: number[];
  ads: { loc: string; code: number }[];
};

const patch: Patch<Payload> = [
  { op: "replace", path: "name", value: { first: "fse", last: "fse" } },
  { op: "replace", path: "name", value: { first: "fse", last: "fse" } },
  { op: "replace", path: ["ages", 2], value: 2 },
  { op: "replace", path: ["ages", 2], value: 2 },
];

export const dupa = {
  name: "ssefse",
  ages: [1, 3, 2],
  ads: [
    {
      loc: "fsef",
      code: 234,
    },
    {
      loc: "xxx",
      code: 333,
    },
  ],
};

export interface Renderer {
  render(renderPayload: unknown): void;
  setSize(size: Size): void;
  setViewport(viewport: Viewport): void;
  setVisibility(visible: boolean): void;
  pickObjects(options: PickingOptions): Promise<PickingResult[]>;
  dispose(): void;
}

export interface GenericRender<T> {
  render(renderPayload: T): void;
  setSize(size: Size): void;
  setViewport(viewport: Viewport): void;
  setVisibility(visible: boolean): void;
  pickObjects(options: PickingOptions): Promise<PickingResult[]>;
  dispose(): void;
}
