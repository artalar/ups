// @flow

type EventProperties = {
  payloadHistory: mixed[],
  isNewPayload: boolean,
  prioritySubscribers: { [string | number]: Set<Function> },
  subscribers: Set<Function>,
};

module.exports = class PubSub {
  /* ::
    _title: string
    _priorityQueues: Array<Set<string>>
    _finalQueue: Set<string>
    _eventsProperties: {
      [string]: EventProperties
    }
    _isPublishing: boolean
    _startOver: boolean
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
    this._isPublishing = true;
    const priorityQueues = this._priorityQueues;
    const payloads = {};

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

            // TODO: ?
            // if (eventsProperties === undefined) return;

            const {
              isNewPayload,
              payloadHistory,
              prioritySubscribers: { [priorityQueueIndex]: subscribers },
            } = eventsProperties;

            if (isNewPayload || !payloads.hasOwnProperty(eventType)) {
              eventsProperties.isNewPayload = false;
              payloads[eventType] = payloadHistory.shift();
            }
            const value = payloads[eventType];

            if (subscribers === undefined) return;

            subscribers.forEach(subscriber => {
              subscriber(value);
              // TODO: ?
              // if (result !== undefined) value = result;
            });
          });

          if (this._startOver) {
            priorityQueueIndex = -1;
          }
        }
      }

      // TODO: ?
      // if (this._finalQueue.size === 0) {
      //   this._isPublishing = false;
      // }
      const eventTypes = this._finalQueue;
      this._finalQueue = new Set();

      eventTypes.forEach(eventType => {
        const eventsProperties = this._eventsProperties[eventType];

        // TODO: ?
        if (eventsProperties === undefined) {
          return;
        }
        const { isNewPayload, payloadHistory, subscribers } = eventsProperties;

        if (isNewPayload || !payloads.hasOwnProperty(eventType)) {
          eventsProperties.isNewPayload = false;
          payloads[eventType] = payloadHistory.shift();
        }
        const value = payloads[eventType];

        if (subscribers === undefined) return;

        subscribers.forEach(subscriber => subscriber(value));
      });

      // good for logging
      const eventsProperties = this._eventsProperties[this._title];
      if (eventsProperties !== undefined) {
        eventsProperties.subscribers.forEach(subscriber =>
          subscriber(payloads),
        );
      }
    } while (this._startOver);

    this._isPublishing = false;
  }

  _startPublish() {
    this._startOver = true;
    if (this._isPublishing === false) {
      this._publish();
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
    eventType?: string,
    priorityIndex?: number,
  ): () => void {
    if (typeof listener !== 'function') {
      throw new TypeError('Expected the listener to be a function.');
    }
    if (eventType === undefined) {
      eventType = this._title;
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
};
