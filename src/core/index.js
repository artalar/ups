// @flow

type EventProperties = {
  payloadHistory: mixed[],
  isNewPayload: boolean,
  prioritySubscribers: { [string | number]: Set<Function> },
  subscribers: Set<Function>,
};

class PubSub {
  /* ::
    _title: string
    _priorityQueues: Array<Set<string>>
    _finalQueue: Set<string>
    _eventsProperties: {
      [string]: EventProperties
    }
    _isPublishing: boolean
    _startOver: boolean
    _payloads: { [string]: mixed }
  */
  constructor(title?: string) {
    this._title = `@@UPS/${title || 'CORE'}`;
    this._priorityQueues = [new Set()];
    this._finalQueue = new Set();
    this._eventsProperties = {};
    this._isPublishing = false;
    this._startOver = false;
  }

  _publish() {
    // FIXME: trycatch
    const priorityQueues = this._priorityQueues;

    do {
      this._startOver = false;
      for (
        let priorityQueueIndex = 0;
        priorityQueueIndex < priorityQueues.length;
        priorityQueueIndex++
      ) {
        this._startOver = false;

        const eventTypes = priorityQueues[priorityQueueIndex];

        if (eventTypes.size !== 0) {
          priorityQueues[priorityQueueIndex] = new Set();

          eventTypes.forEach(eventType => {
            const eventsProperties = this._eventsProperties[eventType];

            const {
              isNewPayload,
              payloadHistory,
              prioritySubscribers: { [priorityQueueIndex]: subscribers },
            } = eventsProperties;

            if (isNewPayload || !this._payloads.hasOwnProperty(eventType)) {
              eventsProperties.isNewPayload = false;
              this._payloads[eventType] = payloadHistory.shift();
            }
            const value = this._payloads[eventType];

            if (subscribers === undefined) return;

            subscribers.forEach(subscriber => {
              subscriber(value);
            });
          });
        }

        if (this._startOver) {
          priorityQueueIndex = -1;
        }
      }
      const eventTypes = this._finalQueue;
      this._finalQueue = new Set();

      eventTypes.forEach(eventType => {
        const eventsProperties = this._eventsProperties[eventType];

        const { isNewPayload, payloadHistory, subscribers } = eventsProperties;

        if (isNewPayload || !this._payloads.hasOwnProperty(eventType)) {
          eventsProperties.isNewPayload = false;
          this._payloads[eventType] = payloadHistory.shift();
        }
        const value = this._payloads[eventType];

        if (subscribers === undefined) return;

        subscribers.forEach(subscriber => subscriber(value));
      });
    } while (this._startOver);
  }

  _startPublish() {
    if (this._isPublishing === false) {
      this._isPublishing = true;
      this._payloads = {};
      this._publish();
      this._isPublishing = false;
      this._payloads = {};
    } else {
      this._startOver = true;
    }
  }

  _createEventProperties(): EventProperties {
    return {
      payloadHistory: [],
      isNewPayload: false,
      subscribers: new Set(),
      prioritySubscribers: {},
    };
  }

  _bindSubscriber(subscribers: Set<Function>, listener: Function) {
    subscribers.add(listener);
    return function unsubscribe() {
      subscribers.delete(listener);
    };
  }

  subscribe(
    listener: Function,
    eventType: string,
    priorityIndex?: number,
  ): () => void {
    if (typeof listener !== 'function') {
      throw new TypeError('Expected the listener to be a function.');
    }
    if (typeof eventType !== 'string') {
      throw new TypeError('Expected the eventType to be a string.');
    }

    const priorityQueuesLength = this._priorityQueues.length;
    const eventProperties =
      this._eventsProperties[eventType] ||
      (this._eventsProperties[eventType] = this._createEventProperties());

    // "reaction" subscriber
    if (priorityIndex === undefined) {
      return this._bindSubscriber(eventProperties.subscribers, listener);
    }

    if (priorityQueuesLength < priorityIndex) {
      throw new Error(
        'Unexpected "priorityIndex" amount. ' +
          `Current: ${priorityQueuesLength}, requested: ${priorityIndex}`,
      );
    }
    if (priorityQueuesLength === priorityIndex) {
      this._priorityQueues.push(new Set());
    }

    const subscribers =
      eventProperties.prioritySubscribers[priorityIndex] ||
      (eventProperties.prioritySubscribers[priorityIndex] = new Set());

    return this._bindSubscriber(subscribers, listener);
  }

  dispatch(eventType: string, payload?: mixed) {
    // TODO: maybe remove that?
    if (eventType === this._title) {
      throw new Error('You can not dispatch directly to dispatcher');
    }

    const eventProperties = this._eventsProperties[eventType];

    if (eventProperties === undefined) return;

    eventProperties.payloadHistory.push(payload);
    eventProperties.isNewPayload = true;

    for (let i = 0; i < this._priorityQueues.length; i++) {
      this._priorityQueues[i].add(eventType);
    }
    this._finalQueue.add(eventType);

    this._startPublish();
  }
}

export type PubSubType = PubSub;

module.exports = PubSub;
