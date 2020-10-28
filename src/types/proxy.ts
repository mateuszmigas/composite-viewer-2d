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
      ? A extends []
        ? { messageType: P; messageIdentifier?: string }
        : {
            messageType: P;
            messageIdentifier?: string;
            messageData: Parameters<T[P]>;
          }
      : never;
  }
>;

export type ProxyReturnEvent<T> = ValueOf<
  {
    [P in keyof T]: T[P] extends (...args: any) => any
      ? ReturnType<T[P]> extends Promise<infer A>
        ? A extends void
          ? {
              messageType: P;
              messageIdentifier?: string;
              messageReturnPromise: ProxyPromiseResult<never>;
            }
          : {
              messageType: P;
              messageIdentifier?: string;
              messageReturnPromise: ProxyPromiseResult<A>;
            }
        : {
            messageType: P;
            messageIdentifier?: string;
          }
      : never;
  }
>;

export type ProxyReturnEventListener<T> = {
  messageCallback: ProxyReturnEvent<T> extends { messageReturnPromise: any }
    ? (returnPromise: ProxyReturnEvent<T>["messageReturnPromise"]) => void
    : () => void;
} & Omit<ProxyReturnEvent<T>, "messageReturnPromise">;
