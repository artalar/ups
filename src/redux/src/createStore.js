import $$observable from 'symbol-observable'
import { PubSub } from '@artalar/ups-core'

import ActionTypes from './utils/actionTypes'
import isPlainObject from './utils/isPlainObject'

const REDUCER_EVENT_TYPE = '@@UPS/redux/REDUCER_EVENT_TYPE'

function sybchronizeDispatch(pubSub) {
  const dispatchOriginal = pubSub.dispatch.bind(pubSub)
  pubSub.dispatch = function dispatch(eventType, payload) {
    if (eventType === REDUCER_EVENT_TYPE) this._isPublishing = false
    dispatchOriginal(eventType, payload)
  }.bind(pubSub)
}

export default function createStore(reducer, preloadedState, enhancer) {
  if (
    (typeof preloadedState === 'function' && typeof enhancer === 'function') ||
    (typeof enhancer === 'function' && typeof arguments[3] === 'function')
  ) {
    throw new Error(
      'It looks like you are passing several store enhancers to ' +
        'createStore(). This is not supported. Instead, compose them ' +
        'together to a single function'
    )
  }

  if (typeof preloadedState === 'function' && typeof enhancer === 'undefined') {
    enhancer = preloadedState
    preloadedState = undefined
  }

  if (typeof enhancer !== 'undefined') {
    if (typeof enhancer !== 'function') {
      throw new Error('Expected the enhancer to be a function.')
    }

    return enhancer(createStore)(reducer, preloadedState)
  }

  if (typeof reducer !== 'function') {
    throw new Error('Expected the reducer to be a function.')
  }

  const pubSub = new PubSub()
  sybchronizeDispatch(pubSub)

  const pubSubDispatch = pubSub.dispatch.bind(pubSub)

  let currentReducer = reducer
  let state = preloadedState
  let isDispatching = false

  function update(action) {
    isDispatching = true
    try {
      state = currentReducer(state, action, pubSubDispatch)
    } finally {
      isDispatching = false
    }
  }

  function getState() {
    if (isDispatching) {
      throw new Error(
        'You may not call store.getState() while the reducer is executing. ' +
          'The reducer has already received the state as an argument. ' +
          'Pass it down from the top reducer instead of reading it from the store.'
      )
    }

    return state
  }

  function subscribe(listener, eventType = REDUCER_EVENT_TYPE) {
    if (typeof listener !== 'function') {
      throw new Error('Expected the listener to be a function.')
    }

    if (isDispatching) {
      throw new Error(
        'You may not call store.subscribe() while the reducer is executing. ' +
          'If you would like to be notified after the store has been updated, subscribe from a ' +
          'component and invoke store.getState() in the callback to access the latest state. ' +
          'See https://redux.js.org/api-reference/store#subscribe(listener) for more details.'
      )
    }

    const cb = eventType === REDUCER_EVENT_TYPE ? () => listener() : listener
    const _unsubscribe = pubSub.subscribe(cb, eventType)

    return function unsubscribe() {
      if (isDispatching) {
        throw new Error(
          'You may not unsubscribe from a store listener while the reducer is executing. ' +
            'See https://redux.js.org/api-reference/store#subscribe(listener) for more details.'
        )
      }

      _unsubscribe()
    }
  }

  function dispatch(action) {
    if (!isPlainObject(action)) {
      throw new Error(
        'Actions must be plain objects. ' +
          'Use custom middleware for async actions.'
      )
    }

    if (typeof action.type === 'undefined') {
      throw new Error(
        'Actions may not have an undefined "type" property. ' +
          'Have you misspelled a constant?'
      )
    }

    if (isDispatching) {
      throw new Error('Reducers may not dispatch actions.')
    }

    pubSubDispatch(REDUCER_EVENT_TYPE, action)

    return action
  }

  function replaceReducer(nextReducer) {
    if (typeof nextReducer !== 'function') {
      throw new Error('Expected the nextReducer to be a function.')
    }

    currentReducer = nextReducer
    dispatch({ type: ActionTypes.REPLACE })
  }

  function observable() {
    const outerSubscribe = subscribe
    return {
      subscribe(observer) {
        if (typeof observer !== 'object' || observer === null) {
          throw new TypeError('Expected the observer to be an object.')
        }

        function observeState() {
          if (observer.next) {
            observer.next(getState())
          }
        }

        observeState()
        const unsubscribe = outerSubscribe(observeState)
        return { unsubscribe }
      },

      [$$observable]() {
        return this
      }
    }
  }

  pubSub.subscribe(update, REDUCER_EVENT_TYPE, 0)

  dispatch({ type: ActionTypes.INIT })

  return {
    dispatch,
    subscribe,
    getState,
    replaceReducer,
    [$$observable]: observable
  }
}
