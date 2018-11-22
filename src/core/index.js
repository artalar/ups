// @flow

type EventProperties = {
  payload?: mixed,
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
    this._priorityQueues = [this._createQueue()];
    this._finalQueue = this._createQueue();
    this._eventsProperties = {};
    this._isPublishing = false;
    this._startOver = false;
  }

  // `Set` can be replaced by simplest `Set` polyfill
  // `{ add(cb){ this._list.push(cb) ... } }`
  // for old browsers
  _createQueue(): Set<string> {
    return new Set();
  }

  _createSubscribers(): Set<Function> {
    return new Set();
  }

  _publish() {
    const priorityQueues = this._priorityQueues;

    do {
      this._startOver = false;
      for (
        let priorityQueueIndex = 0, isLastQueue = false;
        priorityQueueIndex < priorityQueues.length || isLastQueue;
        priorityQueueIndex++,
          isLastQueue = priorityQueueIndex === priorityQueues.length
      ) {
        this._startOver = false;
        let eventTypes;

        if (isLastQueue) {
          eventTypes = this._finalQueue;
          this._finalQueue = this._createQueue();
        } else {
          eventTypes = priorityQueues[priorityQueueIndex];
          priorityQueues[priorityQueueIndex] = this._createQueue();
        }

        if (eventTypes.size !== 0) {
          eventTypes.forEach(eventType => {
            const eventsProperties = this._eventsProperties[eventType];

            const subscribers = isLastQueue
              ? eventsProperties.subscribers
              : eventsProperties.prioritySubscribers[priorityQueueIndex];

            if ('payload' in eventsProperties) {
              this._payloads[eventType] = eventsProperties.payload;
              delete eventsProperties.payload;
            }

            const value = this._payloads[eventType];

            if (subscribers === undefined) return;

            subscribers.forEach(subscriber => subscriber(value));
          });
        }

        if (this._startOver) {
          priorityQueueIndex = -1;
        }
      }
    } while (this._startOver);
  }

  _startPublish() {
    if (this._isPublishing === false) {
      this._isPublishing = true;
      this._payloads = {};
      try {
        this._publish();
      } catch (error) {
        this._isPublishing = false;
        this._payloads = {};
        throw error;
      }

      this._isPublishing = false;
      this._payloads = {};
    } else {
      this._startOver = true;
    }
  }

  _createEventProperties(): EventProperties {
    return {
      subscribers: this._createSubscribers(),
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
      this._priorityQueues.push(this._createQueue());
    }

    if (!eventProperties.prioritySubscribers[priorityIndex]) {
      eventProperties.prioritySubscribers[
        priorityIndex
      ] = this._createSubscribers();
    }
    const subscribers = eventProperties.prioritySubscribers[priorityIndex];

    return this._bindSubscriber(subscribers, listener);
  }

  dispatch(eventType: string, payload?: mixed) {
    if (typeof eventType !== 'string') {
      throw new TypeError('Expected the eventType to be a string.');
    }

    const eventProperties = this._eventsProperties[eventType];

    if (eventProperties === undefined) return;

    eventProperties.payload = payload;

    for (let i = 0; i < this._priorityQueues.length; i++) {
      this._priorityQueues[i].add(eventType);
    }
    this._finalQueue.add(eventType);

    this._startPublish();
  }
}

module.exports = PubSub;
