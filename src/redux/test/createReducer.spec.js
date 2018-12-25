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
      const rootReducerTracked = jest.fn(rootReducer)

      const store = createStore(rootReducerTracked)
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

    it('glitch free', () => {
      const toggle = 'TOGGLE'
      const reducer3Track = jest.fn(Object.assign)

      const reducer1 = createReducer(false).on(toggle, v => !v)
      const reducer2 = createReducer({ reducer1: reducer1.getInit() }).on(
        reducer1,
        (_, reducer1) => ({ reducer1 })
      )
      const reducer12 = combineReducers({
          reducer1,
          reducer2
        })
      const reducer3 = createReducer({
        reducer1: reducer1.getInit(),
        reducer2: reducer2.getInit()
      }).on(
        reducer12,
        reducer3Track
      )

      const rootReducer = combineReducers({
        reducer1,
        reducer2,
        reducer12,
        reducer3
      })

      const rootReducerTracked = jest.fn(rootReducer)

      const store = createStore(rootReducerTracked)
      expect(store.getState()).toEqual({
        reducer1: false,
        reducer2: { reducer1: false },
        reducer12: { reducer1: false, reducer2: { reducer1: false } },
        reducer3: { reducer1: false, reducer2: { reducer1: false } }
      })
      // init
      expect(rootReducerTracked.mock.calls.length).toBe(1)
      expect(reducer3Track.mock.calls.length).toBe(0)

      store.dispatch({ type: toggle })
      expect(store.getState()).toEqual({
        reducer1: true,
        reducer2: { reducer1: true },
        reducer12: { reducer1: true, reducer2: { reducer1: true } },
        reducer3: { reducer1: true, reducer2: { reducer1: true } }
      })
      // init, toggle, reducer1, reducer2, reducer12
      expect(rootReducerTracked.mock.calls.length).toBe(5)
      expect(reducer3Track.mock.calls.length).toBe(1)

      store.dispatch({ type: toggle })
      expect(store.getState()).toEqual({
        reducer1: false,
        reducer2: { reducer1: false },
        reducer12: { reducer1: false, reducer2: { reducer1: false } },
        reducer3: { reducer1: false, reducer2: { reducer1: false } }
      })
    })
  })
})
