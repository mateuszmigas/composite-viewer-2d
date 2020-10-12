import { MyCustomRenderer } from "./MyCustomRenderer"; //cra disable warning
/* eslint-disable */ import { exposeToProxy } from "./viewer2d";

const renderWorker: Worker = self as any;
exposeToProxy(renderWorker, [MyCustomRenderer]);
