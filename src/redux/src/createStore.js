import $$observable from 'symbol-observable';
import { PubSub } from '../../../es';
import ActionTypes from './utils/actionTypes';

const REDUCER_EVENT_TYPE = '@@UPS/redux/REDUCER_EVENT_TYPE';

class PubSubLikeRedux extends PubSub {
  _startPublish() {
    if (this._isPublishing === false) {
      this._isPublishing = true;
      this._payloads = {};
      try {
        this._publish();
      } catch (e) {
        this._isPublishing = false;
        this._payloads = {};
        if (e instanceof Error) throw e;
        if (typeof e === 'string') throw new Error(e);
        const error = new Error(
          '@@UPS: error when notifying subscribers.' +
            '\nSee error data in `data` property of this Error instance',
        );
        // $off
        error.data = e;
        throw error;
      }

      this._isPublishing = false;
      this._payloads = {};
    } else {
      this._startOver = true;
    }
  }
}

export function createStore(reducer, preloadedState, enhancer) {
  if (typeof preloadedState === 'function' && typeof enhancer === 'undefined') {
    enhancer = preloadedState;
    preloadedState = undefined;
  }

  if (typeof enhancer !== 'undefined') {
    return enhancer(createStore)(reducer, preloadedState);
  }


  const pubSub = new PubSub();
  // let isFinalQueueEmpty = false;
  // const dispatchOriginal = pubSub.dispatch;
  // const _startPublishOriginal = pubSub._startPublish;
  // pubSub.dispatch = function(eventType, payload) {
  //   isFinalQueueEmpty = this._finalQueue.size === 0;
  //   dispatchOriginal.call(pubSub, eventType, payload)
  // }.bind(pubSub);
  // pubSub._startPublish = function() {
  //   this._isPublishing = !this._isPublishing || (this._isPublishing && isFinalQueueEmpty && !this._finalQueue.size) ? false : true;
  //   isFinalQueueEmpty = false;
  //   _startPublishOriginal.call(pubSub)
  // }.bind(pubSub);

  const pubSubDispatch = pubSub.dispatch.bind(pubSub)

  let currentReducer = reducer;
  let state = preloadedState;

  function update(action) {
    state = currentReducer(state, action, pubSubDispatch);
  }

  function getState() {
    return state;
  }

  function subscribe(listener, eventType = REDUCER_EVENT_TYPE) {
    const cb = eventType === REDUCER_EVENT_TYPE ? () => listener() : listener
    return pubSub.subscribe(cb, eventType);
  }

  function dispatch(action) {
    pubSubDispatch(REDUCER_EVENT_TYPE, action);

    return action;
  }

  function replaceReducer(nextReducer) {
    currentReducer = nextReducer
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

  pubSub.subscribe(update, REDUCER_EVENT_TYPE, 0);

  dispatch({ type: ActionTypes.INIT })

  return {
    dispatch,
    subscribe,
    getState,
    replaceReducer,
    [$$observable]: observable
  }
}
