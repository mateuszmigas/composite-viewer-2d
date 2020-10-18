import { GenericRender } from "./../renderers/Renderer";
import { Renderer, RenderScheduler } from "../renderers";
import { Serializable, ValueOf } from "./common";

type ProxyPromiseResult<T> =
  | {
      promiseResolution: "fulfilled";
      result: T;
    }
  | {
      promiseResolution: "rejected";
      error: any;
    };

export type ProxyRenderer<TRendererPayload, TParams extends any[]> = {
  new (
    renderScheduler: RenderScheduler,
    canvas: HTMLCanvasElement | OffscreenCanvas,
    ...otherParams: Serializable<TParams>
  ): GenericRender<TRendererPayload>;
};

export type ProxyEvent<T> = ValueOf<
  {
    [P in keyof T]: T[P] extends (...args: infer A) => any
      ? ReturnType<T[P]> extends void
        ? A extends []
          ? { messageType: P }
          : { messageType: P; messageData: Parameters<T[P]> }
        : A extends []
        ? { methodType: P; messageIdentifier: string }
        : {
            messageType: P;
            messageData: Parameters<T[P]>;
            messageIdentifier: string;
          }
      : never;
  }
>;

export type ProxyReturnEvent<T> = ValueOf<
  {
    [P in keyof T]: T[P] extends (...args: any) => any
      ? ReturnType<T[P]> extends void
        ? never
        : ReturnType<T[P]> extends Promise<infer A>
        ? {
            messageType: P;
            messageIdentifier?: string;
            messageReturnValue: ProxyPromiseResult<A>;
          }
        : {
            messageType: P;
            messageIdentifier?: string;
            messageReturnValue: ReturnType<T[P]>;
          }
      : never;
  }
>;

export type ProxyReturnEventListener<T> = {
  messageCallback: (
    returnValue: ProxyReturnEvent<T>["messageReturnValue"]
  ) => void;
} & Omit<ProxyReturnEvent<T>, "messageReturnValue">;
