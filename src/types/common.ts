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
export type TypeToUnion<T> = ValueOf<
  {
    [P in keyof T]: { path: P; value: T[P] };
  }
>;
export type Nullable<T> = { [P in keyof T]: T[P] | null };
export type FilterByTypeKeys<T, X> = {
  [P in keyof T]: T[P] extends X ? P : never;
}[keyof T];
export type FilterByType<T, X> = Pick<T, FilterByTypeKeys<T, X>>;
export type ArrayFieldsOnly<T> = FilterByType<T, any[]>;
