import { ThreeJsRendererer } from "./ThreejsRenderer";
/* eslint-disable */ import { exposeToProxy } from "./viewer2d";

const renderWorker: Worker = self as any;
exposeToProxy(renderWorker, [ThreeJsRendererer]);
