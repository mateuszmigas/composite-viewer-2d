import { Size } from "./geometry";
import { Viewport } from "./viewport";

export type RenderMode = "onDemand" | "continuous";

export type Unsubscribe = () => void;
