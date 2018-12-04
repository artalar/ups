export function combineReducers(reducers) {
  const reducerKeys = Object.keys(reducers);
  const shape = {};

  if (reducerKeys.length === 0) {
    throw new Error("You don't pas any reducer to combineReducers");
  }

  return function reducer(state, action) {
    const newShape = {};
    let isNewState = false;
    for (let i = 0; i < reducerKeys.length; i++) {
      const key = reducerKeys[i];
      newShape[key] = reducers[key](state, action);
      isNewState = newShape[key] !== shape[key] || isNewState;
    }
    return isNewState ? newShape : shape;
  };
}
