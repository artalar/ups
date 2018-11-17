// @flow
import type { PubSubType } from './index';

function withLogging(PubSub: PubSubType) {
  return class PubSubWithLogging extends PubSub {
    _publish() {
      super._publish();
      const payloads = this._payloads;
      const eventsProperties = this._eventsProperties[this._title];
      if (eventsProperties !== undefined) {
        eventsProperties.subscribers.forEach(subscriber =>
          subscriber(payloads),
        );
      }
    }

    subscribe(listener: Function, eventType?: string, priorityIndex?: number) {
      if (eventType === undefined) {
        eventType = this._title;
      }
      return super.subscribe(listener, eventType, priorityIndex);
    }
  };
}

module.exports = withLogging;
