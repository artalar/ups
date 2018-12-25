import {
  UPS_CONTEXT_DISPATCH,
  IS_REDUCER,
  REDUCER_PRIORITY_LEVEL,
  UPS_CONTEXT_SUBSCRIBE,
  getNewReducerName,
  REDUCER_PREFIX,
  upsContextNoop
} from './utils/ups'
import ActionTypes from './utils/actionTypes'

// TODO: JSDoc
export default function createReducer(initialState) {
  const type = getNewReducerName()
  const handlers = {}
  const otherReducerSubscriptions = []

  function reducer(state = initialState, action, upsContext = upsContextNoop) {
    if (handlers.hasOwnProperty(action.type)) {
      const payload = action.type.startsWith(REDUCER_PREFIX)
        ? action.state
        : action
      const newState = handlers[action.type](state, payload)
      if (newState !== state) {
        upsContext[UPS_CONTEXT_DISPATCH](type, newState)
        return newState
      }
    } else if (action.type === ActionTypes.INIT) {
      for (let i = 0; i < otherReducerSubscriptions.length; i++) {
        const { type, priorityLevel } = otherReducerSubscriptions[i]
        upsContext[UPS_CONTEXT_SUBSCRIBE](type, priorityLevel)
      }
    }
    return state
  }

  reducer.type = type
  reducer[IS_REDUCER] = true
  reducer[REDUCER_PRIORITY_LEVEL] = 0

  reducer.getInit = function getInit() {
    return initialState
  }

  reducer.on = function on(target, handler) {
    if (
      target === undefined ||
      !(
        typeof target === 'string' ||
        (typeof target === 'function' && target[IS_REDUCER])
      )
    ) {
      throw new Error(
        'Target must be string (event type) or reducer (from "ups-redux/createReducer")'
      )
    }

    const actionType = typeof target === 'string' ? target : target.type

    if (handlers.hasOwnProperty(actionType)) {
      throw new Error(`Action type "${actionType}" already binded to reducer`)
    }

    handlers[actionType] = handler

    if (target[IS_REDUCER]) {
      otherReducerSubscriptions.push({
        type: target.type,
        priorityLevel: target[REDUCER_PRIORITY_LEVEL]
      })
      reducer[REDUCER_PRIORITY_LEVEL] = Math.max(
        reducer[REDUCER_PRIORITY_LEVEL],
        target[REDUCER_PRIORITY_LEVEL] + 1
      )
    }

    return reducer
  }

  return reducer
}
