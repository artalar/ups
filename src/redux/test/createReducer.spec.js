/* eslint-disable no-console */
import {
  createStore,
  createReducer,
  combineReducers,
  __DO_NOT_USE__ActionTypes as ActionTypes
} from '../'

describe('Utils', () => {
  describe('createReducer', () => {
    it('default', () => {
      const increment = 'INCREMENT'
      const cb = jest.fn()

      const counterReducer = createReducer(0).on(increment, v => v + 1)
      const rootReducer = combineReducers({
        counter: counterReducer
      })

      const store = createStore(rootReducer)
      expect(store.getState()).toEqual({ counter: 0 })

      store.dispatch({ type: increment })
      expect(store.getState().counter).toBe(1)
      expect(cb.mock.calls.length).toBe(0)
    })

    it('subscribe to reducer', () => {
      const increment = 'INCREMENT'
      const cb = jest.fn()

      const counterReducer = createReducer(0).on(increment, v => v + 1)
      const rootReducer = combineReducers({
        counter: counterReducer
      })

      const store = createStore(rootReducer)
      store.subscribe(cb, counterReducer)

      store.dispatch({ type: increment })
      expect(store.getState().counter).toBe(1)
      expect(cb.mock.calls.length).toBe(1)
      expect(cb.mock.calls[0][0]).toBe(1)
    })

    it('handle reducer', () => {
      const increment = 'INCREMENT'

      const counterReducer1 = createReducer(0).on(increment, v => v + 1)
      const counterReducer2 = createReducer(0).on(
        counterReducer1,
        (state, counterReducer1Value) => state + counterReducer1Value
      )
      const rootReducer = combineReducers({
        counter1: counterReducer1,
        counter2: counterReducer2
      })

      const store = createStore(rootReducer)
      expect(store.getState()).toEqual({
        counter1: 0,
        counter2: 0
      })

      store.dispatch({ type: increment })
      expect(store.getState()).toEqual({
        counter1: 1,
        counter2: 1
      })

      store.dispatch({ type: increment })
      expect(store.getState()).toEqual({
        counter1: 2,
        counter2: 3
      })
    })
  })
})
