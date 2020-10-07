/* eslint-disable */ //cra disable warning
import { exposeToProxy } from "./viewer2d";

const renderWorker: Worker = self as any;
exposeToProxy(renderWorker, ["renderer1", "renderer2"]);
