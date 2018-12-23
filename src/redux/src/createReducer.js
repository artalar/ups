// import ActionTypes from './utils/actionTypes';

const IS_REDUCER = '@@UPS/redux/reducer/IS_REDUCER'
const PREFIX = '@@UPS/redux/reducer/PREFIX'
const PRIORITY_LEVEL = '@@UPS/redux/reducer/PRIORITY_LEVEL'
let reducersCount = 0
function noop() {}

export default function createReducer(initialState) {
  const type = `${PREFIX}/${reducersCount++}`
  const handlers = {}

  function reducer(state = initialState, action, dispatch = noop) {
    if (handlers.hasOwnProperty(action.type)) {
      const payload = action.type.startsWith(PREFIX) ? action.state : action
      const newState = handlers[action.type](state, payload)
      if (newState !== state) {
        dispatch(type, newState)
        return newState
      }
      // else return state
    }
    return state
  }

  reducer.type = type
  reducer[IS_REDUCER] = true
  reducer[PRIORITY_LEVEL] = 0

  reducer.on = function on(target, handler) {
    const actionType = typeof target === 'string' ? target : target.type

    if (actionType === undefined) {
      throw new Error('Can not resolve action type of targer')
    }
    if (handlers.hasOwnProperty(actionType)) {
      throw new Error(`Action type "${actionType}" already binded to reducer`)
    }

    handlers[actionType] = handler

    if (target[IS_REDUCER]) {
      reducer[PRIORITY_LEVEL] = Math.max(
        reducer[PRIORITY_LEVEL],
        target[PRIORITY_LEVEL] + 1
      )
    }

    return reducer
  }

  return reducer
}
