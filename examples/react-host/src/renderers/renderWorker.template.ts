import { Canvas2DRenderer } from "./canvas2DRenderer";
import { ThreeJsRendererer } from "./threejsRenderer";
/* eslint-disable */ import { exposeToProxy } from "../viewer2d";

const renderWorker: Worker = self as any;
exposeToProxy(renderWorker, [ThreeJsRendererer, Canvas2DRenderer]);
