import { IRenderScheduler } from "..";
import { WebWorkerCompatibleCanvasConstructor } from "../renderers/WebWorkerRendererProxy";
import { Renderer } from "./common";
import { RenderPayload } from "./renderItem";

export type RendrerMap<T, P extends any[]> =
  | {
      name: string;
      enabled?: boolean;
      payloadSelector: (payload: T) => RenderPayload;
      type: {
        new (
          renderScheduler: IRenderScheduler,
          canvas: HTMLCanvasElement | OffscreenCanvas,
          ...otherParams: P
        ): Renderer;
      };
      params: [HTMLCanvasElement | OffscreenCanvas, ...P];
      async: "a";
    }
  | {
      name: string;
      enabled?: boolean;
      payloadSelector: (payload: T) => RenderPayload;
      type: {
        new (renderScheduler: IRenderScheduler, ...params: P): Renderer;
      };
      params: [any, ...P];
      async: "b";
      //age: number;
    };
