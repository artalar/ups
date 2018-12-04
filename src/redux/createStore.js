import PubSub from '../core';

const STORE_EVENT_TYPE = '@@UPS/redux/STORE_EVENT_TYPE';
const UNSUBSCRIPTIONS = '@@UPS/redux/UNSUBSCRIPTIONS';

class PubSubLikeRedux extends PubSub {
  constructor(...a) {
    super(...a);
    this[UNSUBSCRIPTIONS] = {};
  }

  subscribe(listener, eventType, priorityIndex) {
    if (eventType === undefined) {
      eventType = STORE_EVENT_TYPE;
    }
    const unsubsribe = super.subscribe(listener, eventType, priorityIndex);
    this[UNSUBSCRIPTIONS][eventType] = unsubsribe;
    return unsubsribe;
  }

  unsubscribe(eventType) {
    if (this[UNSUBSCRIPTIONS].hasOwnProperty(eventType)) {
      this[UNSUBSCRIPTIONS][eventType]();
      delete this[UNSUBSCRIPTIONS][eventType];
    }
  }

  dispatch(action) {
    super.dispatch(action.type, action);
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

  const pubSub = new PubSubLikeRedux();

  return pubSub;
}
