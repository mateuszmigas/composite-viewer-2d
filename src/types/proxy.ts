import { ValueOf } from "./common";

type ProxyPromiseResult<T> =
  | {
      promiseResolution: "fulfilled";
      result: T;
    }
  | {
      promiseResolution: "rejected";
      error: any;
    };

export type ProxyEvent<T> = ValueOf<
  {
    [P in keyof T]: T[P] extends (...args: infer A) => any
      ? ReturnType<T[P]> extends void
        ? A extends []
          ? { methodType: P }
          : { methodType: P; methodParams: Parameters<T[P]> }
        : A extends []
        ? { methodType: P; methodIdentifier: string }
        : {
            methodType: P;
            methodParams: Parameters<T[P]>;
            methodIdentifier: string;
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
            methodType: P;
            methodIdentifier: string;
            methodReturnValue: ProxyPromiseResult<A>;
          }
        : {
            methodType: P;
            methodIdentifier: string;
            methodReturnValue: ReturnType<T[P]>;
          }
      : never;
  }
>;
