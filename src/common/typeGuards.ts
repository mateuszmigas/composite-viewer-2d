import { Patch } from "../types/patch";

export function isFunction(x: any): x is Function {
  return typeof x === "function";
}

export const hasPropertyInChain = <T extends {}, P extends PropertyKey>(
  obj: T,
  prop: P
): obj is T & Record<P, unknown> => {
  return prop in obj;
};

export const hasProperty = <T extends {}, P extends PropertyKey>(
  obj: T,
  prop: P
): obj is T & Record<P, unknown> => {
  return obj.hasOwnProperty(prop);
};

export const isArrayPatch = <T>(
  object: Patch<T>
): object is Patch<T> & Record<"op", unknown> => hasProperty(object, "op");
