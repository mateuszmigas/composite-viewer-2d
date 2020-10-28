import { hasProperty } from "../common/typeGuards";
import { assertNever } from "../utils/typeHelpers";
import { ValueOf } from "./common";

type PatchObject<P, V> = { path: P; value: V };
type PatchArray<P, V> =
  | { op: "add"; path: P; values: V[] }
  | { op: "remove"; path: P; indexes: number[] }
  | {
      op: "replace";
      path: P;
      index: number;
      value: V;
    };

export type Patch<T> = ValueOf<
  {
    [P in keyof T]: T[P] extends Array<infer U>
      ? PatchArray<P, U> | PatchObject<P, T[P]>
      : PatchObject<P, T[P]>;
  }
>;

export const applyPatches = <T>(object: T, patches: Patch<T>[]) => {
  patches.forEach(patch => {
    if (hasProperty(patch, "op")) {
      const patchArray = (patch as unknown) as PatchArray<keyof T, unknown>;
      const array = object[patchArray.path];

      if (!Array.isArray(array))
        throw new Error(`Cannot apply array patch '${patch.op}' to an object`);

      switch (patchArray.op) {
        case "add": {
          array.push(patchArray.values);
          break;
        }
        case "remove": {
          patchArray.indexes.forEach(i => array.splice(i, 1));
          break;
        }
        case "replace":
          array[patchArray.index] = patchArray.value;
          break;
        default: {
          assertNever(patchArray);
        }
      }
    } else {
      const patchObject = patch as PatchObject<keyof T, unknown>;
      Object.assign(object, { [patchObject.path]: patchObject.value });
    }
  });
};

//proxy here
export const createPatchProxy = <T>(object: T) => {
  //popPatches()
  //clearPatches()
};
