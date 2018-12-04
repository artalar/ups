// import ActionTypes from './utils/actionTypes';

function noop() {}

export function createReducer(initialState) {
  // FIXME: replace
  const type = Math.random().toString();
  const handlers = {};

  function reducer(state = initialState, action, dispatch = noop) {
    if (handlers.hasOwnProperty(action.type)) {
      const newState = handlers[action.type](state, action);
      if (newState !== state) {
        dispatch({ type, state: newState });
        return newState;
      }
      // else return state
    }
    return state;
  }

  reducer.type = type;

  reducer.on = function on(target, handler) {
    const actionType = typeof target === 'string' ? target : target.type;

    if (actionType === undefined) {
      throw new Error('Can not resolve action type of targer');
    }
    if (handlers.hasOwnProperty(actionType)) {
      throw new Error(`Action type "${actionType}" already binded to reducer`);
    }

    handlers[actionType] = handler;

    return reducer;
  };

  return reducer;
}
