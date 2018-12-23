import {
  UPS_CONTEXT_DISPATCH,
  IS_REDUCER,
  REDUCER_PRIORITY_LEVEL,
  UPS_CONTEXT_SUBSCRIBE
} from './utils/ups'
import ActionTypes from './utils/actionTypes'

const PREFIX = '@@UPS/redux/reducer/PREFIX'

let reducersCount = 0

function noop() {}

// TODO: JSDoc
export default function createReducer(initialState) {
  const type = `${PREFIX}/${reducersCount++}`
  const handlers = {}
  const subscribesToOtherReducers = []

  function reducer(state = initialState, action, upsContext = {}) {
    if (handlers.hasOwnProperty(action.type)) {
      const payload = action.type.startsWith(PREFIX) ? action.state : action
      const newState = handlers[action.type](state, payload)
      if (newState !== state) {
        ;(upsContext[UPS_CONTEXT_DISPATCH] || noop)(type, newState)
        return newState
      }
    } else if (action.type === ActionTypes.INIT) {
      for (let i = 0; i < subscribesToOtherReducers.length; i++) {
        const { type, priorityLevel } = subscribesToOtherReducers[i]
        ;(upsContext[UPS_CONTEXT_SUBSCRIBE] || noop)(type, priorityLevel)
      }
    }
    return state
  }

  reducer.type = type
  reducer[IS_REDUCER] = true
  reducer[REDUCER_PRIORITY_LEVEL] = 0

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
      subscribesToOtherReducers.push({
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
