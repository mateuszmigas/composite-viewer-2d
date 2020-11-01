import { isFunction } from "./typeGuards";

export const createReducer = <TAction, TState>(
  stateProvider: TState | (() => TState),
  reducer: (state: TState, action: TAction) => TState
) => {
  const reduceMany = (state: TState, actions: TAction[]) =>
    actions.reduce(reducer, state);

  if (isFunction(stateProvider)) {
    return (actions: TAction[]) => reduceMany(stateProvider(), actions);
  } else {
    let currentState = { ...stateProvider };
    return (actions: TAction[]) => {
      currentState = reduceMany(currentState, actions);
      return currentState;
    };
  }
};
