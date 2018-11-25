export const PUBLISH_LEVEL = '@@UPS/withLogging/PUBLISH_LEVEL';

function publish(eventsProperties, payloads) {
  if (eventsProperties === undefined) return;

  eventsProperties.subscribers.forEach(subscriber => subscriber(payloads));
}

export default function withLogging(PubSub) {
  return class PubSubWithLogging extends PubSub {
    constructor(...a) {
      super(...a);
      this[PUBLISH_LEVEL] = 0;
    }

    _publish() {
      this[PUBLISH_LEVEL]--;
      super._publish();
      publish(this._eventsProperties[this._title], this._payloads);
    }

    subscribe(listener, eventType, priorityIndex) {
      if (eventType === undefined) {
        eventType = this._title;
      }
      return super.subscribe(listener, eventType, priorityIndex);
    }

    dispatch(eventType, payload) {
      if (eventType === this._title) {
        throw new Error('@@UPS: Can not dispatch directly to dispatcher');
      }

      const publishLevel = this[PUBLISH_LEVEL]++;
      super.dispatch(eventType, payload);
      if (publishLevel !== this[PUBLISH_LEVEL]) {
        this[PUBLISH_LEVEL]--;
        publish(this._eventsProperties[this._title], { [eventType]: payload });
      }
    }
  };
}
