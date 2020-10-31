import { Renderer } from "./../renderers/Renderer";
import { RenderScheduler } from "../renderers";
import { Serializable, ValueOf } from "./common";

type ProxyPromiseResult<T> =
  | {
      promiseResolution: "rejected";
      error: any;
    }
  | (T extends void
      ? {
          promiseResolution: "fulfilled";
        }
      : {
          promiseResolution: "fulfilled";
          result: T;
        });

export type ProxyRenderer<TRendererPayload, TParams extends any[]> = {
  new (
    renderScheduler: RenderScheduler,
    canvas: HTMLCanvasElement | OffscreenCanvas,
    ...otherParams: Serializable<TParams>
  ): Renderer<TRendererPayload>;
};

export type ProxyEvent<T> = ValueOf<
  {
    [P in keyof T]: T[P] extends (...args: infer A) => any
      ? A extends []
        ? { type: P; id?: string }
        : {
            type: P;
            id?: string;
            data: Parameters<T[P]>;
          }
      : never;
  }
>;

export type ProxyReturnEvent<T> = ValueOf<
  {
    [P in keyof T]: T[P] extends (...args: any) => any
      ? ReturnType<T[P]> extends Promise<infer A>
        ? {
            type: P;
            id?: string;
            returnData: ProxyPromiseResult<A>;
          }
        : ReturnType<T[P]> extends void
        ? {
            type: P;
            id?: string;
          }
        : {
            type: P;
            id?: string;
            returnData: ReturnType<T[P]>;
          }
      : never;
  }
>;

export type ProxyReturnEventListener<T> = ValueOf<
  {
    [P in keyof T]: T[P] extends (...args: any) => any
      ? ReturnType<T[P]> extends Promise<infer A>
        ? {
            type: P;
            id?: string;
            callback: (data: ProxyPromiseResult<A>) => void;
          }
        : ReturnType<T[P]> extends void
        ? {
            type: P;
            id?: string;
            callback: () => void;
          }
        : {
            type: P;
            id?: string;
            callback: (data: ReturnType<T[P]>) => void;
          }
      : never;
  }
>;
