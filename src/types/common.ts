export type RenderMode = "onDemand" | "continuous";
export type Unsubscribe = () => void;

export type Serializable<T> = T extends string | number | boolean | null
  ? T
  : T extends Function
  ? never
  : T extends object
  ? { [K in keyof T]: Serializable<T[K]> }
  : never;

export type ValueOf<T> = T[keyof T];
export type Nullable<T> = { [P in keyof T]: T[P] | null };
