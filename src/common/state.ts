import { isFunction } from "./typeGuards";

export const createReducer = <TAction, TState>(
  stateProvider: TState | (() => TState),
  reducer: (action: TAction, state: TState) => TState
): ((actions: TAction[]) => TState) => {
  const reduce = (actions: TAction[], state: TState) =>
    actions.reduce((state, action) => reducer(action, state), state);

  if (isFunction(stateProvider)) {
    return (actions: TAction[]) => reduce(actions, stateProvider());
  } else {
    let currentState = { ...stateProvider };
    return (actions: TAction[]) => {
      currentState = reduce(actions, currentState);
      return currentState;
    };
  }
};
